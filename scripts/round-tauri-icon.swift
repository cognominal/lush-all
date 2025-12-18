import AppKit
import Foundation
import ImageIO

func usage() -> String {
  """
  Usage:
    swift scripts/round-tauri-icon.swift <input.png> [output.png]

  Notes:
    - Produces a macOS-style rounded-rect icon by making the corners transparent.
    - Default output overwrites the input file.
  """
}

let args = CommandLine.arguments.dropFirst()
guard let inputPath = args.first else {
  fputs(usage() + "\n", stderr)
  exit(2)
}

let outputPath = args.dropFirst().first ?? inputPath

let inputURL = URL(fileURLWithPath: String(inputPath))
let outputURL = URL(fileURLWithPath: String(outputPath))

guard
  let src = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
  let img = CGImageSourceCreateImageAtIndex(src, 0, nil)
else {
  fputs("Failed to read PNG: \(inputURL.path)\n", stderr)
  exit(1)
}

let width = img.width
let height = img.height
let size = min(width, height)

let radius = CGFloat(Double(size) * 0.21875) // 224 / 1024
let rect = CGRect(x: 0, y: 0, width: width, height: height)

guard
  let ctx = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  )
else {
  fputs("Failed to create bitmap context\n", stderr)
  exit(1)
}

ctx.interpolationQuality = .high
ctx.setShouldAntialias(true)
ctx.setAllowsAntialiasing(true)

// Flip because CoreGraphics contexts are y-up.
ctx.translateBy(x: 0, y: CGFloat(height))
ctx.scaleBy(x: 1, y: -1)

let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
ctx.addPath(path)
ctx.clip()
ctx.draw(img, in: rect)

guard let out = ctx.makeImage() else {
  fputs("Failed to create output image\n", stderr)
  exit(1)
}

let rep = NSBitmapImageRep(cgImage: out)
guard let png = rep.representation(using: .png, properties: [:]) else {
  fputs("Failed to encode PNG\n", stderr)
  exit(1)
}

do {
  let tmpURL = outputURL.deletingLastPathComponent().appendingPathComponent(".rounded-icon.tmp.png")
  try png.write(to: tmpURL, options: .atomic)

  if outputURL.path == inputURL.path {
    try FileManager.default.removeItem(at: outputURL)
  }
  try FileManager.default.moveItem(at: tmpURL, to: outputURL)
} catch {
  fputs("Failed to write PNG: \(error)\n", stderr)
  exit(1)
}

