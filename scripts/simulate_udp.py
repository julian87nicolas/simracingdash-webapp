"""
Simulador UDP de telemetría F1 para simracingdash-webapp.
Envía paquetes al bridge en el formato que espera el parser de index.ts:

  Offset 48-49: speedKph  (UInt16LE)
  Offset 52:    throttle  (UInt8, 0-255)
  Offset 53:    brake     (UInt8, 0-255)
  Offset 54:    gear      (Int8)
  Offset 55-56: rpm       (UInt16LE)
"""

import socket
import struct
import time
import math

HOST = '127.0.0.1'
PORT = 20777
INTERVAL = 0.1  # segundos entre paquetes (10 Hz)

def build_packet(speed_kph: int, throttle: float, brake: float, gear: int, rpm: int) -> bytes:
    """Construye un buffer de 60 bytes con los valores en los offsets correctos."""
    buf = bytearray(60)

    # Offset 48: speedKph (UInt16LE)
    struct.pack_into('<H', buf, 48, max(0, min(65535, int(speed_kph))))
    # Offset 52: throttle (UInt8, 0-255)
    struct.pack_into('B', buf, 52, max(0, min(255, int(throttle * 255))))
    # Offset 53: brake (UInt8, 0-255)
    struct.pack_into('B', buf, 53, max(0, min(255, int(brake * 255))))
    # Offset 54: gear (Int8)
    struct.pack_into('b', buf, 54, max(-128, min(127, int(gear))))
    # Offset 55: rpm (UInt16LE)
    struct.pack_into('<H', buf, 55, max(0, min(65535, int(rpm))))

    return bytes(buf)

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    print(f"[sim] Enviando paquetes UDP a {HOST}:{PORT} cada {INTERVAL*1000:.0f}ms...")

    t = 0.0
    try:
        while True:
            phase = (t / 3.0) % (2 * math.pi)

            speed   = int(180 + 40 * math.sin(phase))
            rpm     = int(10500 + 1200 * math.sin(phase * 1.3))
            gear    = 6 + round(math.sin(phase * 0.8))
            throttle = max(0.0, min(1.0, 0.7 + 0.3 * math.sin(phase)))
            brake    = max(0.0, min(1.0, 0.4 * math.sin(phase + math.pi)))

            packet = build_packet(speed, throttle, brake, gear, rpm)
            sock.sendto(packet, (HOST, PORT))

            print(f"[sim] speed={speed} rpm={rpm} gear={gear} throttle={throttle:.2f} brake={brake:.2f}")

            t += INTERVAL
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print("\n[sim] Detenido.")
    finally:
        sock.close()

if __name__ == '__main__':
    main()
