# Label & Barcode Printing Setup

FlexStock supports two tiers of label and barcode printing. By default, Tier 1 is enabled and runs without external software. Tier 2 integrates with thermal barcode printers using local middleware.

---

## Tier 1 — Standard Printer (Default)

Tier 1 generates formatted PDF documents that can be printed on standard office printers using A4 or Letter label sheets (such as Avery labels).

- **Generation Engine**: The backend uses `bwip-js` to generate Code128 barcodes or QR codes in memory as PNG images.
- **PDF Compilation**: `pdfkit` lays out the labels on a grid matching standard sheet templates.
- **Configurable Templates**: Set via the `LABEL_TEMPLATE` setting:
  - `2x4`: 8 labels per sheet (large).
  - `3x5`: 15 labels per sheet (medium).
  - `single`: A single large label per page.
- **Printing Flow**:
  1. Click "Generate Labels" in the product action bar.
  2. The browser receives the PDF stream and displays it in a preview frame.
  3. The user triggers the system print dialog via `window.print()`.

---

## Tier 2 — Thermal Printer (Optional)

Tier 2 allows direct, instant printing to industrial thermal barcode printers (such as Zebra, TSC, or Dymo) without opening a browser print dialog.

### How it works:
```
+------------------+                    +------------------+                    +------------------+
|                  |     WebSocket      |                  |   USB / Network    |                  |
|  FlexStock Web   |  ----------------> |   QZ Tray App    |  ----------------> |  Thermal Printer |
|  (React Client)  |   (localhost)      | (Local Machine)  |    (Raw ZPL)       |  (Zebra, etc.)   |
|                  |                    |                  |                    |                  |
+------------------+                    +------------------+                    +------------------+
```

### Installation Steps:
1. **Enable Feature Flag**:
   In your `.env` configuration file, enable the thermal printing option:
   ```env
   THERMAL_PRINTING=true
   ```
2. **Install QZ Tray**:
   Download and install the free, open-source **QZ Tray** agent on the local computer/workstation connected to the printer:
   - Website: [https://qz.io/download/](https://qz.io/download/)
3. **Configure Zebra/Thermal Driver**:
   Ensure your thermal printer is configured using a "Generic / Text Only" driver or raw printer queue so it can parse direct commands.
4. **Accept Connection**:
   When you first load the FlexStock labels page, QZ Tray will prompt you to allow the connection. Check "Remember this decision" and click "Allow".

### Command Syntax (ZPL):
The backend compiles a raw ZPL (Zebra Programming Language) string representing label layout coordinates, font sizes, and barcode ratios:
```zpl
^XA
^FO50,50^A0N,36,20^FDProduct Name^FS
^FO50,100^BY2^BCN,60,Y,N,N^FDPRD-SKU-100^FS
^XZ
```
This ZPL instruction is sent via WebSocket to QZ Tray, which prints it directly onto the label roll.
