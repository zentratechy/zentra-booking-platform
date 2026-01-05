//
//  ClientTableViewCell.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class ClientTableViewCell: UITableViewCell {
    static let identifier = "ClientTableViewCell"
    
    // MARK: - UI Elements
    private let avatarImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.layer.cornerRadius = 25
        imageView.clipsToBounds = true
        imageView.backgroundColor = UIColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 0.1)
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private let nameLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        label.textColor = .label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let emailLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        label.textColor = .systemGray
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let phoneLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        label.textColor = .systemGray
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let loyaltyPointsLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        label.textColor = UIColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 1.0)
        label.textAlignment = .right
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let totalSpentLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 12, weight: .medium)
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
        contentView.addSubview(avatarImageView)
        contentView.addSubview(nameLabel)
        contentView.addSubview(emailLabel)
        contentView.addSubview(phoneLabel)
        contentView.addSubview(loyaltyPointsLabel)
        contentView.addSubview(totalSpentLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Avatar
            avatarImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            avatarImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            avatarImageView.widthAnchor.constraint(equalToConstant: 50),
            avatarImageView.heightAnchor.constraint(equalToConstant: 50),
            
            // Name
            nameLabel.leadingAnchor.constraint(equalTo: avatarImageView.trailingAnchor, constant: 12),
            nameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            nameLabel.trailingAnchor.constraint(equalTo: loyaltyPointsLabel.leadingAnchor, constant: -8),
            
            // Email
            emailLabel.leadingAnchor.constraint(equalTo: avatarImageView.trailingAnchor, constant: 12),
            emailLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 2),
            emailLabel.trailingAnchor.constraint(equalTo: loyaltyPointsLabel.leadingAnchor, constant: -8),
            
            // Phone
            phoneLabel.leadingAnchor.constraint(equalTo: avatarImageView.trailingAnchor, constant: 12),
            phoneLabel.topAnchor.constraint(equalTo: emailLabel.bottomAnchor, constant: 2),
            phoneLabel.trailingAnchor.constraint(equalTo: loyaltyPointsLabel.leadingAnchor, constant: -8),
            phoneLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Loyalty Points
            loyaltyPointsLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            loyaltyPointsLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            loyaltyPointsLabel.widthAnchor.constraint(equalToConstant: 80),
            
            // Total Spent
            totalSpentLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            totalSpentLabel.topAnchor.constraint(equalTo: loyaltyPointsLabel.bottomAnchor, constant: 2),
            totalSpentLabel.widthAnchor.constraint(equalToConstant: 80)
        ])
    }
    
    // MARK: - Configuration
    func configure(with client: Client) {
        nameLabel.text = client.name
        emailLabel.text = client.email ?? "No email"
        phoneLabel.text = client.phone ?? "No phone"
        loyaltyPointsLabel.text = "\(client.loyaltyPoints) pts"
        totalSpentLabel.text = String(format: "£%.2f", client.totalSpent)
        
        // Set avatar with initials
        setupAvatar(with: client.name)
    }
    
    private func setupAvatar(with name: String) {
        let initials = name.components(separatedBy: " ")
            .compactMap { $0.first }
            .map { String($0).uppercased() }
            .joined()
        
        let label = UILabel()
        label.text = initials
        label.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        label.textColor = UIColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 1.0)
        label.textAlignment = .center
        
        // Create image from label
        let size = CGSize(width: 50, height: 50)
        UIGraphicsBeginImageContextWithOptions(size, false, 0)
        label.drawText(in: CGRect(origin: .zero, size: size))
        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        avatarImageView.image = image
    }
}






