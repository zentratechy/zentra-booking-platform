//
//  ClientDetailViewController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class ClientDetailViewController: UIViewController {
    
    private let client: Client
    private let scrollView = UIScrollView()
    private let contentView = UIView()
    
    // MARK: - UI Elements
    private let headerView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let avatarView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor(red: 1.0, green: 0.8, blue: 0.9, alpha: 1.0) // Light pink
        view.layer.cornerRadius = 40
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let avatarLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 24, weight: .semibold)
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let nameLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        label.textColor = .label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let emailLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let closeButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("✕", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 24, weight: .semibold)
        button.tintColor = .label
        button.backgroundColor = UIColor.systemGray5
        button.layer.cornerRadius = 20
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    // MARK: - Data Properties
    private var visitsCount: Int = 0
    private var pendingAmount: Double = 0.0
    private var consultations: [Any] = [] // Placeholder for consultations
    
    init(client: Client) {
        self.client = client
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupLuxuryGradientBackground()
        setupUI()
        setupConstraints()
        setupActions()
        loadAdditionalData()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientBackground()
    }
    
    // MARK: - Setup
    private func setupUI() {
        navigationController?.setNavigationBarHidden(true, animated: false)
        
        // Setup initials
        let initials = getInitials(from: client.name)
        avatarLabel.text = initials
        
        // Setup labels
        nameLabel.text = client.name
        emailLabel.text = client.email ?? "No email"
        
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        contentView.addSubview(headerView)
        
        headerView.addSubview(avatarView)
        avatarView.addSubview(avatarLabel)
        headerView.addSubview(nameLabel)
        headerView.addSubview(emailLabel)
        headerView.addSubview(closeButton)
        
        // Add sections
        let contactSection = createContactInfoSection()
        let loyaltySection = createLoyaltyStatsSection()
        let consultationsSection = createConsultationsSection()
        
        contentView.addSubview(contactSection)
        contentView.addSubview(loyaltySection)
        contentView.addSubview(consultationsSection)
        
        // Set up section constraints
        NSLayoutConstraint.activate([
            contactSection.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 20),
            contactSection.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            contactSection.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            
            loyaltySection.topAnchor.constraint(equalTo: contactSection.bottomAnchor, constant: 20),
            loyaltySection.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            loyaltySection.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            
            consultationsSection.topAnchor.constraint(equalTo: loyaltySection.bottomAnchor, constant: 20),
            consultationsSection.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            consultationsSection.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            consultationsSection.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -20)
        ])
    }
    
    private func setupConstraints() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        contentView.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            
            // Header
            headerView.topAnchor.constraint(equalTo: contentView.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            headerView.heightAnchor.constraint(equalToConstant: 120),
            
            avatarView.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 20),
            avatarView.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            avatarView.widthAnchor.constraint(equalToConstant: 80),
            avatarView.heightAnchor.constraint(equalToConstant: 80),
            
            avatarLabel.centerXAnchor.constraint(equalTo: avatarView.centerXAnchor),
            avatarLabel.centerYAnchor.constraint(equalTo: avatarView.centerYAnchor),
            
            nameLabel.leadingAnchor.constraint(equalTo: avatarView.trailingAnchor, constant: 16),
            nameLabel.topAnchor.constraint(equalTo: avatarView.topAnchor, constant: 8),
            nameLabel.trailingAnchor.constraint(lessThanOrEqualTo: closeButton.leadingAnchor, constant: -16),
            
            emailLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
            emailLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
            emailLabel.trailingAnchor.constraint(lessThanOrEqualTo: closeButton.leadingAnchor, constant: -16),
            
            closeButton.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -20),
            closeButton.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 40),
            closeButton.heightAnchor.constraint(equalToConstant: 40)
        ])
    }
    
    private func setupActions() {
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
    }
    
    @objc private func closeTapped() {
        navigationController?.popViewController(animated: true)
    }
    
    // MARK: - Section Creators
    private func createContactInfoSection() -> UIView {
        let sectionView = UIView()
        sectionView.translatesAutoresizingMaskIntoConstraints = false
        sectionView.backgroundColor = .systemBackground
        
        let titleLabel = UILabel()
        titleLabel.text = "Contact Information"
        titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let phoneCard = createInfoCard(title: "Phone", value: client.phone ?? "—")
        let emailCard = createInfoCard(title: "Email", value: client.email ?? "—")
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        dateFormatter.timeStyle = .none
        let memberSince = dateFormatter.string(from: client.createdAt)
        let memberSinceCard = createInfoCard(title: "Member Since", value: memberSince)
        
        sectionView.addSubview(titleLabel)
        sectionView.addSubview(phoneCard)
        sectionView.addSubview(emailCard)
        sectionView.addSubview(memberSinceCard)
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: sectionView.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            
            phoneCard.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            phoneCard.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            phoneCard.widthAnchor.constraint(equalToConstant: (UIScreen.main.bounds.width - 60) / 2),
            phoneCard.heightAnchor.constraint(equalToConstant: 80),
            
            emailCard.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            emailCard.leadingAnchor.constraint(equalTo: phoneCard.trailingAnchor, constant: 20),
            emailCard.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            emailCard.heightAnchor.constraint(equalToConstant: 80),
            
            memberSinceCard.topAnchor.constraint(equalTo: phoneCard.bottomAnchor, constant: 16),
            memberSinceCard.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            memberSinceCard.widthAnchor.constraint(equalToConstant: (UIScreen.main.bounds.width - 60) / 2),
            memberSinceCard.heightAnchor.constraint(equalToConstant: 80),
            memberSinceCard.bottomAnchor.constraint(equalTo: sectionView.bottomAnchor, constant: -20)
        ])
        
        return sectionView
    }
    
    private func createLoyaltyStatsSection() -> UIView {
        let sectionView = UIView()
        sectionView.translatesAutoresizingMaskIntoConstraints = false
        sectionView.backgroundColor = .systemBackground
        
        let titleLabel = UILabel()
        titleLabel.text = "Loyalty & Stats"
        titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let pointsCard = createStatCard(value: "\(client.loyaltyPoints)", label: "Points", color: UIColor(red: 1.0, green: 0.9, blue: 0.95, alpha: 1.0))
        let visitsCard = createStatCard(value: "\(visitsCount)", label: "Visits", color: UIColor.systemGray6)
        let totalValueCard = createTotalValueCard()
        let tierCard = createStatCard(value: calculateTier(), label: "Tier", color: UIColor.systemGray6)
        
        sectionView.addSubview(titleLabel)
        sectionView.addSubview(pointsCard)
        sectionView.addSubview(visitsCard)
        sectionView.addSubview(totalValueCard)
        sectionView.addSubview(tierCard)
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: sectionView.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            
            pointsCard.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            pointsCard.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            pointsCard.widthAnchor.constraint(equalToConstant: (UIScreen.main.bounds.width - 60) / 2),
            pointsCard.heightAnchor.constraint(equalToConstant: 100),
            
            visitsCard.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            visitsCard.leadingAnchor.constraint(equalTo: pointsCard.trailingAnchor, constant: 20),
            visitsCard.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            visitsCard.heightAnchor.constraint(equalToConstant: 100),
            
            totalValueCard.topAnchor.constraint(equalTo: pointsCard.bottomAnchor, constant: 16),
            totalValueCard.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            totalValueCard.widthAnchor.constraint(equalToConstant: (UIScreen.main.bounds.width - 60) / 2),
            totalValueCard.heightAnchor.constraint(equalToConstant: 100),
            
            tierCard.topAnchor.constraint(equalTo: visitsCard.bottomAnchor, constant: 16),
            tierCard.leadingAnchor.constraint(equalTo: totalValueCard.trailingAnchor, constant: 20),
            tierCard.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            tierCard.heightAnchor.constraint(equalToConstant: 100),
            tierCard.bottomAnchor.constraint(equalTo: sectionView.bottomAnchor, constant: -20)
        ])
        
        return sectionView
    }
    
    private func createConsultationsSection() -> UIView {
        let sectionView = UIView()
        sectionView.translatesAutoresizingMaskIntoConstraints = false
        sectionView.backgroundColor = .systemBackground
        
        let titleLabel = UILabel()
        titleLabel.text = "Consultations"
        titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let newConsultationButton = UIButton(type: .system)
        newConsultationButton.setTitle("+ New Consultation", for: .normal)
        newConsultationButton.setTitleColor(UIColor(red: 1.0, green: 0.4, blue: 0.6, alpha: 1.0), for: .normal)
        newConsultationButton.titleLabel?.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        newConsultationButton.translatesAutoresizingMaskIntoConstraints = false
        
        let emptyStateView = UIView()
        emptyStateView.backgroundColor = UIColor.systemGray6
        emptyStateView.layer.cornerRadius = 12
        emptyStateView.translatesAutoresizingMaskIntoConstraints = false
        
        let documentIcon = UIImageView(image: UIImage(systemName: "doc.text"))
        documentIcon.tintColor = .secondaryLabel
        documentIcon.contentMode = .scaleAspectFit
        documentIcon.translatesAutoresizingMaskIntoConstraints = false
        
        let emptyStateLabel = UILabel()
        emptyStateLabel.text = "No consultations yet"
        emptyStateLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        emptyStateLabel.textColor = .secondaryLabel
        emptyStateLabel.textAlignment = .center
        emptyStateLabel.translatesAutoresizingMaskIntoConstraints = false
        
        emptyStateView.addSubview(documentIcon)
        emptyStateView.addSubview(emptyStateLabel)
        sectionView.addSubview(titleLabel)
        sectionView.addSubview(newConsultationButton)
        sectionView.addSubview(emptyStateView)
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: sectionView.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            
            newConsultationButton.centerYAnchor.constraint(equalTo: titleLabel.centerYAnchor),
            newConsultationButton.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            
            emptyStateView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            emptyStateView.leadingAnchor.constraint(equalTo: sectionView.leadingAnchor, constant: 20),
            emptyStateView.trailingAnchor.constraint(equalTo: sectionView.trailingAnchor, constant: -20),
            emptyStateView.heightAnchor.constraint(equalToConstant: 200),
            emptyStateView.bottomAnchor.constraint(equalTo: sectionView.bottomAnchor, constant: -20),
            
            documentIcon.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            documentIcon.centerYAnchor.constraint(equalTo: emptyStateView.centerYAnchor, constant: -10),
            documentIcon.widthAnchor.constraint(equalToConstant: 40),
            documentIcon.heightAnchor.constraint(equalToConstant: 40),
            
            emptyStateLabel.topAnchor.constraint(equalTo: documentIcon.bottomAnchor, constant: 12),
            emptyStateLabel.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            emptyStateLabel.leadingAnchor.constraint(equalTo: emptyStateView.leadingAnchor, constant: 20),
            emptyStateLabel.trailingAnchor.constraint(equalTo: emptyStateView.trailingAnchor, constant: -20)
        ])
        
        return sectionView
    }
    
    // MARK: - Helper Methods
    private func createInfoCard(title: String, value: String) -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor.systemGray6
        card.layer.cornerRadius = 12
        card.translatesAutoresizingMaskIntoConstraints = false
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        titleLabel.textColor = .secondaryLabel
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        valueLabel.textColor = .label
        valueLabel.numberOfLines = 0
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        
        card.addSubview(titleLabel)
        card.addSubview(valueLabel)
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            
            valueLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            valueLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            valueLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            valueLabel.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -12)
        ])
        
        return card
    }
    
    private func createStatCard(value: String, label: String, color: UIColor) -> UIView {
        let card = UIView()
        card.backgroundColor = color
        card.layer.cornerRadius = 12
        card.translatesAutoresizingMaskIntoConstraints = false
        
        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = UIFont.systemFont(ofSize: 28, weight: .bold)
        valueLabel.textColor = .label
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let labelLabel = UILabel()
        labelLabel.text = label
        labelLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        labelLabel.textColor = .secondaryLabel
        labelLabel.translatesAutoresizingMaskIntoConstraints = false
        
        card.addSubview(valueLabel)
        card.addSubview(labelLabel)
        
        NSLayoutConstraint.activate([
            valueLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
            valueLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            valueLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            
            labelLabel.topAnchor.constraint(equalTo: valueLabel.bottomAnchor, constant: 4),
            labelLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            labelLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            labelLabel.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -16)
        ])
        
        return card
    }
    
    private func createTotalValueCard() -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor.systemGray6
        card.layer.cornerRadius = 12
        card.translatesAutoresizingMaskIntoConstraints = false
        
        let valueLabel = UILabel()
        valueLabel.text = String(format: "£%.2f", client.totalSpent)
        valueLabel.font = UIFont.systemFont(ofSize: 28, weight: .bold)
        valueLabel.textColor = .label
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let labelLabel = UILabel()
        labelLabel.text = "Total Value"
        labelLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        labelLabel.textColor = .secondaryLabel
        labelLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let pendingLabel = UILabel()
        pendingLabel.text = String(format: "£%.2f pending", pendingAmount)
        pendingLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        pendingLabel.textColor = .systemRed
        pendingLabel.translatesAutoresizingMaskIntoConstraints = false
        
        card.addSubview(valueLabel)
        card.addSubview(labelLabel)
        card.addSubview(pendingLabel)
        
        NSLayoutConstraint.activate([
            valueLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
            valueLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            valueLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            
            labelLabel.topAnchor.constraint(equalTo: valueLabel.bottomAnchor, constant: 4),
            labelLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            labelLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            
            pendingLabel.topAnchor.constraint(equalTo: labelLabel.bottomAnchor, constant: 4),
            pendingLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            pendingLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            pendingLabel.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -16)
        ])
        
        return card
    }
    
    private func getInitials(from name: String) -> String {
        let components = name.components(separatedBy: " ")
        if components.count >= 2 {
            let first = String(components[0].prefix(1)).uppercased()
            let last = String(components[components.count - 1].prefix(1)).uppercased()
            return "\(first)\(last)"
        } else if !components.isEmpty {
            return String(components[0].prefix(2)).uppercased()
        }
        return "??"
    }
    
    private func calculateTier() -> String {
        // Simple tier calculation based on total spent
        // You can adjust these thresholds
        if client.totalSpent >= 500 {
            return "GOLD"
        } else if client.totalSpent >= 250 {
            return "SILVER"
        } else {
            return "BRONZE"
        }
    }
    
    private func loadAdditionalData() {
        // TODO: Load visits count and pending amount from Firestore
        // For now, using placeholder values
        visitsCount = 0 // Will be loaded from appointments
        pendingAmount = 0.0 // Will be calculated from pending appointments
    }
}
