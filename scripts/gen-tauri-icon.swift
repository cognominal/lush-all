import AppKit
import Foundation

func usage() -> String {
  """
  Usage:
    swift scripts/gen-tauri-icon.swift <output.png>

  Generates a 1024x1024 PNG app icon with macOS-style rounded corners.
  """
}

let args = CommandLine.arguments.dropFirst()
guard let outputPath = args.first else {
  fputs(usage() + "\n", stderr)
  exit(2)
}

let size = 1024
let radius = CGFloat(224) // matches common macOS icon rounding
let safeInset = CGFloat(100) // 1024 - 2*100 = 824 "safe area"

guard
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )
else {
  fputs("Failed to create bitmap\n", stderr)
  exit(1)
}

guard let graphicsContext = NSGraphicsContext(bitmapImageRep: rep) else {
  fputs("Failed to create graphics context\n", stderr)
  exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphicsContext
graphicsContext.imageInterpolation = .high
graphicsContext.shouldAntialias = true

let ctx = graphicsContext.cgContext
let rect = CGRect(x: 0, y: 0, width: size, height: size)

// Transparent background.
ctx.setFillColor(NSColor.clear.cgColor)
ctx.fill(rect)

// Rounded blue tile.
let tileColor = NSColor(calibratedRed: 0x1D / 255.0, green: 0x4E / 255.0, blue: 0xD8 / 255.0, alpha: 1)
let tilePath = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
ctx.addPath(tilePath)
ctx.setFillColor(tileColor.cgColor)
ctx.fillPath()

func roundedSystemFont(size: CGFloat, weight: NSFont.Weight) -> NSFont {
  let base = NSFont.systemFont(ofSize: size, weight: weight)
  if let rounded = base.fontDescriptor.withDesign(.rounded),
     let font = NSFont(descriptor: rounded, size: size)
  {
    return font
  }
  return base
}

func font(_ font: NSFont, supports text: String) -> Bool {
  guard let ctFont = font as CTFont? else { return false }
  var chars = Array(text.utf16)
  var glyphs = Array(repeating: CGGlyph(), count: chars.count)
  return CTFontGetGlyphsForCharacters(ctFont, &chars, &glyphs, chars.count)
}

func bestFont(for text: String, size: CGFloat, weight: NSFont.Weight) -> NSFont {
  let rounded = roundedSystemFont(size: size, weight: weight)
  if font(rounded, supports: text) { return rounded }
  return NSFont.systemFont(ofSize: size, weight: weight)
}

func attributed(_ text: String, fontSize: CGFloat, weight: NSFont.Weight) -> NSAttributedString {
  let font = bestFont(for: text, size: fontSize, weight: weight)
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white
  ]
  return NSAttributedString(string: text, attributes: attributes)
}

let tauLowercase = "\u{03C4}" // τ (lowercase Greek tau)
let tau = attributed(tauLowercase, fontSize: 520, weight: .bold)
let ell = attributed("l", fontSize: 560, weight: .heavy)

func bounds(of attributedString: NSAttributedString) -> CGRect {
  attributedString.boundingRect(
    with: CGSize(width: 10_000, height: 10_000),
    options: [.usesLineFragmentOrigin, .usesFontLeading]
  )
}

let tauBounds = bounds(of: tau)
let ellBounds = bounds(of: ell)

let spacing = CGFloat(size) * 0.06
let tauRect = CGRect(x: 0, y: 0, width: tauBounds.width, height: tauBounds.height)
let ellY = (tauBounds.height - ellBounds.height) / 2
let ellRect = CGRect(
  x: tauBounds.width + spacing,
  y: ellY,
  width: ellBounds.width,
  height: ellBounds.height
)
let monogramRect = tauRect.union(ellRect)

let safeRect = rect.insetBy(dx: safeInset, dy: safeInset)
let scale = min(safeRect.width / monogramRect.width, safeRect.height / monogramRect.height) * 0.98

ctx.saveGState()
ctx.translateBy(x: safeRect.midX, y: safeRect.midY)
ctx.scaleBy(x: scale, y: scale)
ctx.translateBy(x: -monogramRect.midX, y: -monogramRect.midY)

tau.draw(at: CGPoint(x: tauRect.minX - tauBounds.minX, y: tauRect.minY - tauBounds.minY))
ell.draw(at: CGPoint(x: ellRect.minX - ellBounds.minX, y: ellRect.minY - ellBounds.minY))

ctx.restoreGState()

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
  fputs("Failed to encode PNG\n", stderr)
  exit(1)
}

do {
  try png.write(to: URL(fileURLWithPath: String(outputPath)), options: .atomic)
} catch {
  fputs("Failed to write PNG: \(error)\n", stderr)
  exit(1)
}
