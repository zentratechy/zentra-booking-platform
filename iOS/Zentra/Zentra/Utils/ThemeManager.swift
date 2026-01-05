//
//  ThemeManager.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class ThemeManager {
    static let shared = ThemeManager()
    
    // MARK: - Colors (matching website)
    struct Colors {
        // Primary colors
        static let primary = UIColor(red: 0.831, green: 0.647, blue: 0.455, alpha: 1.0) // #d4a574
        static let primaryDark = UIColor(red: 0.722, green: 0.561, blue: 0.380, alpha: 1.0) // #b88f61
        static let secondary = UIColor(red: 0.961, green: 0.902, blue: 0.827, alpha: 1.0) // #f5e6d3
        static let accent = UIColor(red: 0.545, green: 0.451, blue: 0.333, alpha: 1.0) // #8b7355
        static let softPink = UIColor(red: 0.992, green: 0.965, blue: 0.941, alpha: 1.0) // #fdf6f0
        static let softCream = UIColor(red: 0.980, green: 0.973, blue: 0.961, alpha: 1.0) // #faf8f5
        
        // System colors
        static let background = UIColor.systemBackground
        static let secondaryBackground = UIColor.secondarySystemBackground
        static let label = UIColor.label
        static let secondaryLabel = UIColor.secondaryLabel
        static let separator = UIColor.separator
    }
    
    // MARK: - Typography
    struct Typography {
        // Headings (Playfair Display equivalent)
        static let largeTitle = UIFont.systemFont(ofSize: 34, weight: .bold)
        static let title1 = UIFont.systemFont(ofSize: 28, weight: .bold)
        static let title2 = UIFont.systemFont(ofSize: 22, weight: .bold)
        static let title3 = UIFont.systemFont(ofSize: 20, weight: .semibold)
        
        // Body text (Inter equivalent)
        static let body = UIFont.systemFont(ofSize: 17, weight: .regular)
        static let bodyBold = UIFont.systemFont(ofSize: 17, weight: .semibold)
        static let callout = UIFont.systemFont(ofSize: 16, weight: .regular)
        static let calloutBold = UIFont.systemFont(ofSize: 16, weight: .semibold)
        static let subheadline = UIFont.systemFont(ofSize: 15, weight: .regular)
        static let footnote = UIFont.systemFont(ofSize: 13, weight: .regular)
        static let caption = UIFont.systemFont(ofSize: 12, weight: .regular)
    }
    
    // MARK: - Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }
    
    // MARK: - Corner Radius
    struct CornerRadius {
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let extraLarge: CGFloat = 20
    }
    
    // MARK: - Shadow
    struct Shadow {
        static let light = ShadowStyle(
            color: UIColor.black.withAlphaComponent(0.1),
            offset: CGSize(width: 0, height: 2),
            radius: 4,
            opacity: 1
        )
        
        static let medium = ShadowStyle(
            color: UIColor.black.withAlphaComponent(0.15),
            offset: CGSize(width: 0, height: 4),
            radius: 8,
            opacity: 1
        )
        
        static let heavy = ShadowStyle(
            color: UIColor.black.withAlphaComponent(0.2),
            offset: CGSize(width: 0, height: 8),
            radius: 16,
            opacity: 1
        )
    }
    
    struct ShadowStyle {
        let color: UIColor
        let offset: CGSize
        let radius: CGFloat
        let opacity: Float
    }
    
    // MARK: - Gradient Background
    static func createLuxuryGradientLayer(frame: CGRect) -> CAGradientLayer {
        let gradientLayer = CAGradientLayer()
        gradientLayer.colors = [
            UIColor(red: 0.92, green: 0.88, blue: 0.90, alpha: 1.0).cgColor, // Soft rose
            UIColor(red: 0.95, green: 0.92, blue: 0.88, alpha: 1.0).cgColor, // Cream
            UIColor(red: 0.92, green: 0.90, blue: 0.92, alpha: 1.0).cgColor  // Soft lavender
        ]
        gradientLayer.locations = [0.0, 0.5, 1.0]
        gradientLayer.frame = frame
        gradientLayer.startPoint = CGPoint(x: 0, y: 0)
        gradientLayer.endPoint = CGPoint(x: 1, y: 1)
        gradientLayer.isOpaque = false
        return gradientLayer
    }
    
    private init() {}
}

// MARK: - UIView Extensions
extension UIView {
    @objc func applyPrimaryButtonStyle() {
        backgroundColor = ThemeManager.Colors.primary
        layer.cornerRadius = ThemeManager.CornerRadius.medium
        layer.shadowColor = ThemeManager.Shadow.light.color.cgColor
        layer.shadowOffset = ThemeManager.Shadow.light.offset
        layer.shadowRadius = ThemeManager.Shadow.light.radius
        layer.shadowOpacity = ThemeManager.Shadow.light.opacity
    }
    
    @objc func applySecondaryButtonStyle() {
        backgroundColor = ThemeManager.Colors.secondary
        layer.cornerRadius = ThemeManager.CornerRadius.medium
        layer.borderWidth = 1
        layer.borderColor = ThemeManager.Colors.primary.cgColor
    }
    
    func applyCardStyle() {
        backgroundColor = ThemeManager.Colors.background
        layer.cornerRadius = ThemeManager.CornerRadius.medium
        layer.shadowColor = ThemeManager.Shadow.light.color.cgColor
        layer.shadowOffset = ThemeManager.Shadow.light.offset
        layer.shadowRadius = ThemeManager.Shadow.light.radius
        layer.shadowOpacity = ThemeManager.Shadow.light.opacity
    }
    
    func applyLuxuryCardStyle() {
        backgroundColor = UIColor.white
        layer.cornerRadius = 32
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 10)
        layer.shadowRadius = 30
        layer.shadowOpacity = 0.15
    }
    
    func applySoftBackground() {
        backgroundColor = ThemeManager.Colors.softCream
    }
}

// MARK: - UIViewController Extensions
extension UIViewController {
    func setupLuxuryGradientBackground() {
        view.backgroundColor = UIColor(red: 0.95, green: 0.92, blue: 0.88, alpha: 1.0)
        view.isUserInteractionEnabled = true
        
        // Remove existing gradient layers
        view.layer.sublayers?.forEach { layer in
            if layer is CAGradientLayer {
                layer.removeFromSuperlayer()
            }
        }
        
        let gradientLayer = ThemeManager.createLuxuryGradientLayer(frame: view.bounds)
        view.layer.insertSublayer(gradientLayer, at: 0)
    }
    
    func updateGradientBackground() {
        if let gradientLayer = view.layer.sublayers?.first(where: { $0 is CAGradientLayer }) as? CAGradientLayer {
            gradientLayer.frame = view.bounds
        }
    }
}

// MARK: - UILabel Extensions
extension UILabel {
    func applyPrimaryTitleStyle() {
        font = ThemeManager.Typography.title2
        textColor = ThemeManager.Colors.label
    }
    
    func applySecondaryTitleStyle() {
        font = ThemeManager.Typography.title3
        textColor = ThemeManager.Colors.label
    }
    
    func applyBodyStyle() {
        font = ThemeManager.Typography.body
        textColor = ThemeManager.Colors.label
    }
    
    func applyCaptionStyle() {
        font = ThemeManager.Typography.caption
        textColor = ThemeManager.Colors.secondaryLabel
    }
}

// MARK: - UIButton Extensions
extension UIButton {
    @objc override func applyPrimaryButtonStyle() {
        setTitleColor(.white, for: .normal)
        titleLabel?.font = ThemeManager.Typography.calloutBold
        backgroundColor = ThemeManager.Colors.primary
        layer.cornerRadius = ThemeManager.CornerRadius.medium
        layer.shadowColor = ThemeManager.Shadow.light.color.cgColor
        layer.shadowOffset = ThemeManager.Shadow.light.offset
        layer.shadowRadius = ThemeManager.Shadow.light.radius
        layer.shadowOpacity = ThemeManager.Shadow.light.opacity
    }
    
    @objc override func applySecondaryButtonStyle() {
        setTitleColor(ThemeManager.Colors.primary, for: .normal)
        titleLabel?.font = ThemeManager.Typography.calloutBold
        backgroundColor = ThemeManager.Colors.secondary
        layer.cornerRadius = ThemeManager.CornerRadius.medium
        layer.borderWidth = 1
        layer.borderColor = ThemeManager.Colors.primary.cgColor
    }
}
