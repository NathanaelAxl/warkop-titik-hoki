"use client";
// Koneksi printer thermal Bluetooth (ESC/POS) lewat Web Bluetooth di Chrome.
import { buildReceipt, buildTestReceipt, toEscPos } from "./receipt";
import type { OrderDetail, StoreInfo } from "./types";

// Service UUID yang umum dipakai printer thermal 58mm murah (BLE)
const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
];

const LS_KEY = "th_printer";

export type PrinterState = { status: "disconnected" | "connecting" | "connected"; name: string | null };

let device: BluetoothDevice | null = null;
let charac: BluetoothRemoteGATTCharacteristic | null = null;
let state: PrinterState = { status: "disconnected", name: null };
const listeners = new Set<(s: PrinterState) => void>();

function setState(s: Partial<PrinterState>) {
  state = { ...state, ...s };
  listeners.forEach((l) => l(state));
}

export function getPrinterState() {
  if (state.name == null && typeof window !== "undefined") state.name = savedPrinter()?.name ?? null;
  return state;
}

export function subscribePrinter(fn: (s: PrinterState) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function bluetoothSupported() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

function savedPrinter(): { id: string; name: string } | null {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
  } catch {
    return null;
  }
}

async function attach(dev: BluetoothDevice) {
  setState({ status: "connecting", name: dev.name ?? "Printer" });
  dev.addEventListener("gattserverdisconnected", () => {
    charac = null;
    setState({ status: "disconnected" });
  });
  const server = await dev.gatt!.connect();
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const w = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (w) {
      device = dev;
      charac = w;
      localStorage.setItem(LS_KEY, JSON.stringify({ id: dev.id, name: dev.name ?? "Printer" }));
      setState({ status: "connected", name: dev.name ?? "Printer" });
      return;
    }
  }
  dev.gatt?.disconnect();
  setState({ status: "disconnected" });
  throw new Error("Printer tidak punya jalur tulis yang dikenali. Pastikan printer mendukung ESC/POS BLE.");
}

/** Pilih printer baru (wajib dari klik tombol). */
export async function connectPrinter() {
  if (!bluetoothSupported()) throw new Error("Browser tidak mendukung Web Bluetooth. Pakai Chrome di Android dan buka lewat HTTPS.");
  const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  try {
    await attach(dev);
  } catch (e) {
    setState({ status: "disconnected" });
    throw e;
  }
}

/** Coba sambung ulang ke printer terakhir tanpa memilih lagi (jika browser mengizinkan). */
export async function reconnectPrinter(): Promise<boolean> {
  if (charac && device?.gatt?.connected) return true;
  if (device) {
    try {
      await attach(device);
      return true;
    } catch {
      /* lanjut */
    }
  }
  const saved = savedPrinter();
  const nav = navigator.bluetooth as Bluetooth & { getDevices?: () => Promise<BluetoothDevice[]> };
  if (!saved || !nav?.getDevices) return false;
  try {
    const devs = await nav.getDevices();
    const dev = devs.find((d) => d.id === saved.id);
    if (!dev) return false;
    await attach(dev);
    return true;
  } catch {
    setState({ status: "disconnected" });
    return false;
  }
}

export function disconnectPrinter() {
  device?.gatt?.disconnect();
  device = null;
  charac = null;
  setState({ status: "disconnected" });
}

export function forgetPrinter() {
  disconnectPrinter();
  localStorage.removeItem(LS_KEY);
  setState({ name: null });
}

async function writeBytes(data: Uint8Array) {
  if (!(await reconnectPrinter()) || !charac)
    throw new Error("Printer belum terhubung. Buka menu Printer lalu hubungkan.");
  const c = charac;
  const CHUNK = 100;
  for (let i = 0; i < data.length; i += CHUNK) {
    const part = data.slice(i, i + CHUNK);
    if (c.properties.writeWithoutResponse) {
      await c.writeValueWithoutResponse(part);
      await new Promise((r) => setTimeout(r, 25));
    } else {
      await c.writeValue(part);
    }
  }
}

export async function printReceipt(order: OrderDetail, store: StoreInfo, reprint = false) {
  await writeBytes(toEscPos(buildReceipt(order, store, { reprint })));
}

export async function printTest(store: StoreInfo) {
  await writeBytes(toEscPos(buildTestReceipt(store)));
}
