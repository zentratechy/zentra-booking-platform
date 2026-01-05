//
//  AppointmentTableViewCell.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class AppointmentTableViewCell: UITableViewCell {
    static let identifier = "AppointmentTableViewCell"
    
    // MARK: - UI Elements
    private let timeLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.calloutBold
        label.textColor = ThemeManager.Colors.primary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let clientNameLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.calloutBold
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let serviceNameLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.subheadline
        label.textColor = ThemeManager.Colors.secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let durationLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.caption
        label.textColor = ThemeManager.Colors.secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let statusLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.caption
        label.textAlignment = .right
        label.layer.cornerRadius = 4
        label.clipsToBounds = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let priceLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.subheadline
        label.textColor = .systemGreen
        label.textAlignment = .right
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        setupConstraints()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    private func setupUI() {
        contentView.addSubview(timeLabel)
        contentView.addSubview(clientNameLabel)
        contentView.addSubview(serviceNameLabel)
        contentView.addSubview(durationLabel)
        contentView.addSubview(statusLabel)
        contentView.addSubview(priceLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Time Label
            timeLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            timeLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            timeLabel.widthAnchor.constraint(equalToConstant: 80),
            
            // Client Name
            clientNameLabel.leadingAnchor.constraint(equalTo: timeLabel.trailingAnchor, constant: 12),
            clientNameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            clientNameLabel.trailingAnchor.constraint(equalTo: statusLabel.leadingAnchor, constant: -8),
            
            // Service Name
            serviceNameLabel.leadingAnchor.constraint(equalTo: timeLabel.trailingAnchor, constant: 12),
            serviceNameLabel.topAnchor.constraint(equalTo: clientNameLabel.bottomAnchor, constant: 4),
            serviceNameLabel.trailingAnchor.constraint(equalTo: statusLabel.leadingAnchor, constant: -8),
            
            // Duration
            durationLabel.leadingAnchor.constraint(equalTo: timeLabel.trailingAnchor, constant: 12),
            durationLabel.topAnchor.constraint(equalTo: serviceNameLabel.bottomAnchor, constant: 4),
            durationLabel.trailingAnchor.constraint(equalTo: statusLabel.leadingAnchor, constant: -8),
            durationLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Status
            statusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            statusLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            statusLabel.widthAnchor.constraint(equalToConstant: 80),
            statusLabel.heightAnchor.constraint(equalToConstant: 20),
            
            // Price
            priceLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            priceLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 4),
            priceLabel.widthAnchor.constraint(equalToConstant: 80)
        ])
    }
    
    // MARK: - Configuration
    func configure(with appointment: Appointment) {
        // Time - use explicit format to ensure correct time display
        let timeFormatter = DateFormatter()
        timeFormatter.locale = Locale(identifier: "en_GB") // Use 24-hour format locale
        timeFormatter.timeZone = TimeZone.current
        timeFormatter.dateFormat = "HH:mm" // 24-hour format
        timeLabel.text = timeFormatter.string(from: appointment.date)
        
        // Debug: Print the actual date to verify time is preserved
        let debugFormatter = DateFormatter()
        debugFormatter.dateStyle = .medium
        debugFormatter.timeStyle = .medium
        print("AppointmentTableViewCell: Date = \(debugFormatter.string(from: appointment.date)), Formatted time = \(timeFormatter.string(from: appointment.date))")
        
        // Client and service
        clientNameLabel.text = appointment.clientName
        serviceNameLabel.text = appointment.serviceName
        
        // Duration
        durationLabel.text = "\(appointment.duration) min"
        
        // Price
        priceLabel.text = String(format: "£%.2f", appointment.price)
        
        // Status
        configureStatusLabel(with: appointment.status)
    }
    
    private func configureStatusLabel(with status: AppointmentStatus) {
        statusLabel.text = status.rawValue.capitalized
        
        switch status {
        case .pending:
            statusLabel.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.2)
            statusLabel.textColor = .systemOrange
        case .confirmed:
            statusLabel.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.2)
            statusLabel.textColor = .systemBlue
        case .arrived:
            statusLabel.backgroundColor = UIColor.systemPurple.withAlphaComponent(0.2)
            statusLabel.textColor = .systemPurple
        case .started:
            statusLabel.backgroundColor = UIColor.systemIndigo.withAlphaComponent(0.2)
            statusLabel.textColor = .systemIndigo
        case .completed:
            statusLabel.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.2)
            statusLabel.textColor = .systemGreen
        case .noShow:
            statusLabel.backgroundColor = UIColor.systemRed.withAlphaComponent(0.2)
            statusLabel.textColor = .systemRed
        case .cancelled:
            statusLabel.backgroundColor = UIColor.systemGray.withAlphaComponent(0.2)
            statusLabel.textColor = .systemGray
        }
    }
}

