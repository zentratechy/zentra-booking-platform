//
//  PaymentTableViewCell.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class PaymentTableViewCell: UITableViewCell {
    static let identifier = "PaymentTableViewCell"
    
    // MARK: - UI Elements
    private let clientNameLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        label.textColor = .label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let serviceNameLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        label.textColor = .systemGray
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let dateLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        label.textColor = .systemGray2
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let amountLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 18, weight: .bold)
        label.textColor = .label
        label.textAlignment = .right
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let statusLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        label.textAlignment = .right
        label.layer.cornerRadius = 4
        label.clipsToBounds = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let paymentMethodLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        label.textColor = .systemGray2
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
        contentView.addSubview(clientNameLabel)
        contentView.addSubview(serviceNameLabel)
        contentView.addSubview(dateLabel)
        contentView.addSubview(amountLabel)
        contentView.addSubview(statusLabel)
        contentView.addSubview(paymentMethodLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Client Name
            clientNameLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            clientNameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            clientNameLabel.trailingAnchor.constraint(equalTo: amountLabel.leadingAnchor, constant: -8),
            
            // Service Name
            serviceNameLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            serviceNameLabel.topAnchor.constraint(equalTo: clientNameLabel.bottomAnchor, constant: 4),
            serviceNameLabel.trailingAnchor.constraint(equalTo: amountLabel.leadingAnchor, constant: -8),
            
            // Date
            dateLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            dateLabel.topAnchor.constraint(equalTo: serviceNameLabel.bottomAnchor, constant: 4),
            dateLabel.trailingAnchor.constraint(equalTo: amountLabel.leadingAnchor, constant: -8),
            dateLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Amount
            amountLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            amountLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            amountLabel.widthAnchor.constraint(equalToConstant: 100),
            
            // Status
            statusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            statusLabel.topAnchor.constraint(equalTo: amountLabel.bottomAnchor, constant: 4),
            statusLabel.widthAnchor.constraint(equalToConstant: 100),
            statusLabel.heightAnchor.constraint(equalToConstant: 20),
            
            // Payment Method
            paymentMethodLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            paymentMethodLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 2),
            paymentMethodLabel.widthAnchor.constraint(equalToConstant: 100),
            paymentMethodLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12)
        ])
    }
    
    // MARK: - Configuration
    func configure(with appointment: Appointment) {
        clientNameLabel.text = appointment.clientName
        serviceNameLabel.text = appointment.serviceName
        
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        dateLabel.text = formatter.string(from: appointment.date)
        
        amountLabel.text = String(format: "£%.2f", appointment.price)
        
        if let payment = appointment.payment {
            configureStatusLabel(with: payment.status)
            paymentMethodLabel.text = payment.method ?? "Unknown"
        } else {
            // Handle appointments without payment info
            statusLabel.text = "No Payment Info"
            statusLabel.backgroundColor = UIColor.systemGray5.withAlphaComponent(0.2)
            statusLabel.textColor = .systemGray
            paymentMethodLabel.text = "N/A"
        }
    }
    
    private func configureStatusLabel(with status: PaymentStatus) {
        statusLabel.text = status.rawValue.capitalized
        
        switch status {
        case .paid:
            statusLabel.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.2)
            statusLabel.textColor = .systemGreen
        case .pending:
            statusLabel.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.2)
            statusLabel.textColor = .systemOrange
        case .refunded:
            statusLabel.backgroundColor = UIColor.systemRed.withAlphaComponent(0.2)
            statusLabel.textColor = .systemRed
        case .partial:
            statusLabel.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.2)
            statusLabel.textColor = .systemBlue
        }
    }
}

