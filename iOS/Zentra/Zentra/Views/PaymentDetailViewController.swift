//
//  PaymentDetailViewController.swift
//  Zentra
//
//  Created by James Clark on 26/10/2025.
//

import UIKit
import FirebaseFirestore

class PaymentDetailViewController: UIViewController {
    
    // MARK: - Properties
    private let appointment: Appointment
    private let db = Firestore.firestore()
    
    // MARK: - UI Elements
    private let pageTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Collect Payment"
        label.font = UIFont.systemFont(ofSize: 42, weight: .light)
        label.textColor = UIColor(red: 0.25, green: 0.25, blue: 0.3, alpha: 1.0)
        label.textAlignment = .left
        label.translatesAutoresizingMaskIntoConstraints = false
        
        // Add subtle shadow for depth
        label.layer.shadowColor = UIColor.white.withAlphaComponent(0.5).cgColor
        label.layer.shadowOffset = CGSize(width: 0, height: 2)
        label.layer.shadowRadius = 8
        label.layer.shadowOpacity = 0.8
        
        // Apply letter spacing
        let attributedString = NSMutableAttributedString(string: "Collect Payment")
        attributedString.addAttribute(.kern, value: 2.0, range: NSRange(location: 0, length: attributedString.length))
        label.attributedText = attributedString
        
        return label
    }()
    
    private let contentCard: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.white
        view.layer.cornerRadius = 32
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOffset = CGSize(width: 0, height: 10)
        view.layer.shadowRadius = 30
        view.layer.shadowOpacity = 0.15
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let scrollView = UIScrollView()
    private let contentView = UIView()
    
    // Header
    private let headerIconView: UIView = {
        let view = UIView()
        view.backgroundColor = ThemeManager.Colors.primary.withAlphaComponent(0.1)
        view.layer.cornerRadius = 30
        return view
    }()
    
    private let headerIconLabel: UILabel = {
        let label = UILabel()
        label.text = "£"
        label.font = ThemeManager.Typography.largeTitle
        label.textColor = ThemeManager.Colors.primary
        label.textAlignment = .center
        return label
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Payment Options"
        label.font = UIFont.systemFont(ofSize: 24, weight: .light)
        label.textColor = UIColor(red: 0.25, green: 0.25, blue: 0.3, alpha: 1.0)
        label.textAlignment = .center
        return label
    }()
    
    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.body
        label.textColor = ThemeManager.Colors.secondaryLabel
        label.textAlignment = .center
        return label
    }()
    
    // Payment Link Section
    private let paymentLinkContainer: UIView = {
        let view = UIView()
        view.backgroundColor = ThemeManager.Colors.softPink.withAlphaComponent(0.1)
        view.layer.cornerRadius = ThemeManager.CornerRadius.medium
        view.layer.borderWidth = 1
        view.layer.borderColor = ThemeManager.Colors.softPink.withAlphaComponent(0.3).cgColor
        return view
    }()
    
    private let paymentLinkIcon: UIImageView = {
        let imageView = UIImageView()
        imageView.image = UIImage(systemName: "envelope.fill")
        imageView.tintColor = ThemeManager.Colors.primary
        imageView.contentMode = .scaleAspectFit
        return imageView
    }()
    
    private let paymentLinkTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Payment Link"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        return label
    }()
    
    private let paymentLinkSubtitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Customer pays online securely"
        label.font = ThemeManager.Typography.caption
        label.textColor = ThemeManager.Colors.secondaryLabel
        return label
    }()
    
    private let emailLinkButton: UIButton = {
        let button = UIButton(type: .system)
        var config = UIButton.Configuration.filled()
        config.title = "Email Link"
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = UIFont.systemFont(ofSize: 16, weight: .medium)
            return outgoing
        }
        config.baseBackgroundColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        config.baseForegroundColor = .white
        config.image = UIImage(systemName: "envelope")
        config.imagePlacement = .leading
        config.imagePadding = 8
        config.cornerStyle = .fixed
        config.background.cornerRadius = 16
        button.configuration = config
        return button
    }()
    
    private let copyLinkButton: UIButton = {
        let button = UIButton(type: .system)
        var config = UIButton.Configuration.filled()
        config.title = "Copy Link"
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = UIFont.systemFont(ofSize: 16, weight: .medium)
            return outgoing
        }
        config.baseBackgroundColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        config.baseForegroundColor = .white
        config.image = UIImage(systemName: "link")
        config.imagePlacement = .leading
        config.imagePadding = 8
        config.cornerStyle = .fixed
        config.background.cornerRadius = 16
        button.configuration = config
        return button
    }()
    
    private let amountInfoLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.caption
        label.textColor = ThemeManager.Colors.secondaryLabel
        label.textAlignment = .center
        return label
    }()
    
    // Manual Payment Section
    private let paymentMethodLabel: UILabel = {
        let label = UILabel()
        label.text = "Payment Method"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        return label
    }()
    
    private let paymentMethodTextField: UITextField = {
        let textField = UITextField()
        textField.borderStyle = .none
        textField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        textField.layer.cornerRadius = 16
        textField.font = ThemeManager.Typography.body
        textField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        textField.leftViewMode = .always
        return textField
    }()
    
    private let amountLabel: UILabel = {
        let label = UILabel()
        label.text = "Amount"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        return label
    }()
    
    private let amountTextField: UITextField = {
        let textField = UITextField()
        textField.borderStyle = .none
        textField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        textField.layer.cornerRadius = 16
        textField.font = ThemeManager.Typography.body
        textField.keyboardType = .decimalPad
        textField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        textField.leftViewMode = .always
        return textField
    }()
    
    private let summaryLabel: UILabel = {
        let label = UILabel()
        label.font = ThemeManager.Typography.caption
        label.textColor = ThemeManager.Colors.secondaryLabel
        return label
    }()
    
    private let notesLabel: UILabel = {
        let label = UILabel()
        label.text = "Notes (optional)"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        return label
    }()
    
    private let notesTextView: UITextView = {
        let textView = UITextView()
        textView.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        textView.layer.cornerRadius = 16
        textView.font = ThemeManager.Typography.body
        textView.textColor = ThemeManager.Colors.label
        textView.text = "Payment reference, notes..."
        textView.textColor = ThemeManager.Colors.secondaryLabel
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        return textView
    }()
    
    // Action Buttons
    private let cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        button.setTitleColor(UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0), for: .normal)
        button.backgroundColor = UIColor.white
        button.layer.cornerRadius = 20
        button.layer.borderWidth = 2
        button.layer.borderColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0).cgColor
        return button
    }()
    
    private let recordPaymentButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Record Payment", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        button.layer.cornerRadius = 20
        button.layer.shadowColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 0.5).cgColor
        button.layer.shadowOffset = CGSize(width: 0, height: 8)
        button.layer.shadowRadius = 16
        button.layer.shadowOpacity = 0.4
        return button
    }()
    
    // MARK: - Initialization
    init(appointment: Appointment) {
        self.appointment = appointment
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupLuxuryGradientBackground()
        setupUI()
        setupConstraints()
        setupActions()
        populateData()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientBackground()
    }
    
    // MARK: - Setup
    private func setupUI() {
        setupLuxuryGradientBackground()
        
        // Style navigation bar
        navigationController?.navigationBar.tintColor = ThemeManager.Colors.primary
        navigationController?.navigationBar.barTintColor = UIColor.clear
        navigationController?.navigationBar.setBackgroundImage(UIImage(), for: .default)
        navigationController?.navigationBar.shadowImage = UIImage()
        navigationController?.navigationBar.isTranslucent = true
        
        // Add subviews
        view.addSubview(pageTitleLabel)
        view.addSubview(contentCard)
        contentCard.addSubview(scrollView)
        scrollView.backgroundColor = UIColor.clear
        scrollView.addSubview(contentView)
        contentView.backgroundColor = UIColor.clear
        
        contentView.addSubview(headerIconView)
        headerIconView.addSubview(headerIconLabel)
        contentView.addSubview(titleLabel)
        contentView.addSubview(subtitleLabel)
        
        contentView.addSubview(paymentLinkContainer)
        paymentLinkContainer.addSubview(paymentLinkIcon)
        paymentLinkContainer.addSubview(paymentLinkTitleLabel)
        paymentLinkContainer.addSubview(paymentLinkSubtitleLabel)
        paymentLinkContainer.addSubview(emailLinkButton)
        paymentLinkContainer.addSubview(copyLinkButton)
        contentView.addSubview(amountInfoLabel)
        
        contentView.addSubview(paymentMethodLabel)
        contentView.addSubview(paymentMethodTextField)
        contentView.addSubview(amountLabel)
        contentView.addSubview(amountTextField)
        contentView.addSubview(summaryLabel)
        contentView.addSubview(notesLabel)
        contentView.addSubview(notesTextView)
        
        contentView.addSubview(cancelButton)
        contentView.addSubview(recordPaymentButton)
        
        // Setup text field delegates
        notesTextView.delegate = self
        amountTextField.delegate = self
        
        // Setup payment method picker
        setupPaymentMethodPicker()
    }
    
    private func setupPaymentMethodPicker() {
        let paymentMethods = ["Cash", "Bank Transfer", "Card Payment", "Voucher"]
        let picker = UIPickerView()
        picker.delegate = self
        picker.dataSource = self
        paymentMethodTextField.inputView = picker
        paymentMethodTextField.text = paymentMethods[0]
        
        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        let doneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(paymentMethodPickerDone))
        toolbar.setItems([doneButton], animated: true)
        paymentMethodTextField.inputAccessoryView = toolbar
    }
    
    private func setupConstraints() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        contentView.translatesAutoresizingMaskIntoConstraints = false
        
        // Header elements
        headerIconView.translatesAutoresizingMaskIntoConstraints = false
        headerIconLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Payment link elements
        paymentLinkContainer.translatesAutoresizingMaskIntoConstraints = false
        paymentLinkIcon.translatesAutoresizingMaskIntoConstraints = false
        paymentLinkTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        paymentLinkSubtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        emailLinkButton.translatesAutoresizingMaskIntoConstraints = false
        copyLinkButton.translatesAutoresizingMaskIntoConstraints = false
        amountInfoLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Manual payment elements
        paymentMethodLabel.translatesAutoresizingMaskIntoConstraints = false
        paymentMethodTextField.translatesAutoresizingMaskIntoConstraints = false
        amountLabel.translatesAutoresizingMaskIntoConstraints = false
        amountTextField.translatesAutoresizingMaskIntoConstraints = false
        summaryLabel.translatesAutoresizingMaskIntoConstraints = false
        notesLabel.translatesAutoresizingMaskIntoConstraints = false
        notesTextView.translatesAutoresizingMaskIntoConstraints = false
        
        // Action buttons
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        recordPaymentButton.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            // Page Title Label
            pageTitleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            pageTitleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            pageTitleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            
            // Content Card
            contentCard.topAnchor.constraint(equalTo: pageTitleLabel.bottomAnchor, constant: 24),
            contentCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            contentCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            contentCard.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            
            // Scroll view
            scrollView.topAnchor.constraint(equalTo: contentCard.topAnchor, constant: 20),
            scrollView.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: contentCard.bottomAnchor, constant: -20),
            
            // Content view
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            contentView.heightAnchor.constraint(greaterThanOrEqualTo: scrollView.heightAnchor),
            
            // Header
            headerIconView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            headerIconView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            headerIconView.widthAnchor.constraint(equalToConstant: 60),
            headerIconView.heightAnchor.constraint(equalToConstant: 60),
            
            headerIconLabel.centerXAnchor.constraint(equalTo: headerIconView.centerXAnchor),
            headerIconLabel.centerYAnchor.constraint(equalTo: headerIconView.centerYAnchor),
            
            titleLabel.topAnchor.constraint(equalTo: headerIconView.bottomAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            subtitleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            subtitleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Payment Link Section
            paymentLinkContainer.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 24),
            paymentLinkContainer.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentLinkContainer.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            paymentLinkContainer.heightAnchor.constraint(equalToConstant: 180),
            
            paymentLinkIcon.topAnchor.constraint(equalTo: paymentLinkContainer.topAnchor, constant: 16),
            paymentLinkIcon.leadingAnchor.constraint(equalTo: paymentLinkContainer.leadingAnchor, constant: 16),
            paymentLinkIcon.widthAnchor.constraint(equalToConstant: 24),
            paymentLinkIcon.heightAnchor.constraint(equalToConstant: 24),
            
            paymentLinkTitleLabel.topAnchor.constraint(equalTo: paymentLinkContainer.topAnchor, constant: 16),
            paymentLinkTitleLabel.leadingAnchor.constraint(equalTo: paymentLinkIcon.trailingAnchor, constant: 12),
            paymentLinkTitleLabel.trailingAnchor.constraint(equalTo: paymentLinkContainer.trailingAnchor, constant: -16),
            
            paymentLinkSubtitleLabel.topAnchor.constraint(equalTo: paymentLinkTitleLabel.bottomAnchor, constant: 4),
            paymentLinkSubtitleLabel.leadingAnchor.constraint(equalTo: paymentLinkIcon.trailingAnchor, constant: 12),
            paymentLinkSubtitleLabel.trailingAnchor.constraint(equalTo: paymentLinkContainer.trailingAnchor, constant: -16),
            
            emailLinkButton.topAnchor.constraint(equalTo: paymentLinkSubtitleLabel.bottomAnchor, constant: 16),
            emailLinkButton.leadingAnchor.constraint(equalTo: paymentLinkContainer.leadingAnchor, constant: 16),
            emailLinkButton.trailingAnchor.constraint(equalTo: paymentLinkContainer.centerXAnchor, constant: -8),
            emailLinkButton.heightAnchor.constraint(equalToConstant: 44),
            
            copyLinkButton.topAnchor.constraint(equalTo: paymentLinkSubtitleLabel.bottomAnchor, constant: 16),
            copyLinkButton.leadingAnchor.constraint(equalTo: paymentLinkContainer.centerXAnchor, constant: 8),
            copyLinkButton.trailingAnchor.constraint(equalTo: paymentLinkContainer.trailingAnchor, constant: -16),
            copyLinkButton.heightAnchor.constraint(equalToConstant: 44),
            
            amountInfoLabel.topAnchor.constraint(equalTo: emailLinkButton.bottomAnchor, constant: 12),
            amountInfoLabel.leadingAnchor.constraint(equalTo: paymentLinkContainer.leadingAnchor, constant: 16),
            amountInfoLabel.trailingAnchor.constraint(equalTo: paymentLinkContainer.trailingAnchor, constant: -16),
            
            // Manual Payment Section
            paymentMethodLabel.topAnchor.constraint(equalTo: paymentLinkContainer.bottomAnchor, constant: 24),
            paymentMethodLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentMethodLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentMethodTextField.topAnchor.constraint(equalTo: paymentMethodLabel.bottomAnchor, constant: 8),
            paymentMethodTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentMethodTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            paymentMethodTextField.heightAnchor.constraint(equalToConstant: 44),
            
            amountLabel.topAnchor.constraint(equalTo: paymentMethodTextField.bottomAnchor, constant: 16),
            amountLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            amountLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            amountTextField.topAnchor.constraint(equalTo: amountLabel.bottomAnchor, constant: 8),
            amountTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            amountTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            amountTextField.heightAnchor.constraint(equalToConstant: 44),
            
            summaryLabel.topAnchor.constraint(equalTo: amountTextField.bottomAnchor, constant: 8),
            summaryLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            summaryLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            notesLabel.topAnchor.constraint(equalTo: summaryLabel.bottomAnchor, constant: 16),
            notesLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            notesLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            notesTextView.topAnchor.constraint(equalTo: notesLabel.bottomAnchor, constant: 8),
            notesTextView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            notesTextView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            notesTextView.heightAnchor.constraint(equalToConstant: 80),
            
            // Action Buttons
            cancelButton.topAnchor.constraint(equalTo: notesTextView.bottomAnchor, constant: 32),
            cancelButton.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            cancelButton.trailingAnchor.constraint(equalTo: contentView.centerXAnchor, constant: -8),
            cancelButton.heightAnchor.constraint(equalToConstant: 50),
            cancelButton.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -20),
            
            recordPaymentButton.topAnchor.constraint(equalTo: notesTextView.bottomAnchor, constant: 32),
            recordPaymentButton.leadingAnchor.constraint(equalTo: contentView.centerXAnchor, constant: 8),
            recordPaymentButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            recordPaymentButton.heightAnchor.constraint(equalToConstant: 50)
        ])
    }
    
    private func setupActions() {
        emailLinkButton.addTarget(self, action: #selector(emailLinkTapped), for: .touchUpInside)
        copyLinkButton.addTarget(self, action: #selector(copyLinkTapped), for: .touchUpInside)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        recordPaymentButton.addTarget(self, action: #selector(recordPaymentTapped), for: .touchUpInside)
        
        // Add keyboard dismissal
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
    }
    
    private func populateData() {
        subtitleLabel.text = "Payment for \(appointment.clientName)"
        amountInfoLabel.text = "Amount: £\(String(format: "%.2f", appointment.price)) • Or record manual payment below"
        amountTextField.text = String(format: "%.2f", appointment.price)
        
        // Calculate payment summary
        let totalDue = appointment.price
        let alreadyPaid = appointment.payment?.amount ?? 0.0
        summaryLabel.text = "Total due: £\(String(format: "%.2f", totalDue))\nAlready paid: £\(String(format: "%.2f", alreadyPaid))"
    }
    
    // MARK: - Actions
    @objc private func emailLinkTapped() {
        sendPaymentLinkEmail()
    }
    
    @objc private func copyLinkTapped() {
        let paymentLink = "\(ConfigurationManager.shared.paymentLinkBaseUrl)/\(appointment.id)"
        UIPasteboard.general.string = paymentLink
        showAlert(title: "Link Copied", message: "Payment link copied to clipboard")
    }
    
    @objc private func cancelTapped() {
        navigationController?.popViewController(animated: true)
    }
    
    @objc private func recordPaymentTapped() {
        guard let amountText = amountTextField.text,
              let amount = Double(amountText),
              let paymentMethod = paymentMethodTextField.text else {
            showAlert(title: "Error", message: "Please enter a valid amount and payment method")
            return
        }
        
        // Create payment record
        let payment = PaymentInfo(
            status: .paid,
            amount: amount,
            method: paymentMethod,
            transactionId: nil,
            paidAt: Date(),
            depositRequired: appointment.payment?.depositRequired,
            depositPercentage: appointment.payment?.depositPercentage,
            depositPaid: appointment.payment?.depositPaid ?? false,
            remainingBalance: max(0, (appointment.payment?.remainingBalance ?? appointment.price) - amount)
        )
        
        // Create updated appointment with payment info
        let updatedAppointment = Appointment(
            id: appointment.id,
            clientId: appointment.clientId,
            clientName: appointment.clientName,
            clientEmail: appointment.clientEmail,
            serviceName: appointment.serviceName,
            serviceId: appointment.serviceId,
            serviceCategory: appointment.serviceCategory,
            staffId: appointment.staffId,
            staffName: appointment.staffName,
            locationId: appointment.locationId,
            locationName: appointment.locationName,
            date: appointment.date,
            duration: appointment.duration,
            bufferTime: appointment.bufferTime,
            price: appointment.price,
            status: appointment.status,
            payment: payment,
            notes: appointment.notes,
            businessId: appointment.businessId,
            createdAt: appointment.createdAt
        )
        
        // Save to Firestore
        db.collection("appointments").document(appointment.id).setData(updatedAppointment.dictionary) { [weak self] error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.showAlert(title: "Error", message: "Failed to record payment: \(error.localizedDescription)")
                } else {
                    self?.showAlert(title: "Success", message: "Payment recorded successfully") {
                        self?.navigationController?.popViewController(animated: true)
                    }
                }
            }
        }
    }
    
    @objc private func paymentMethodPickerDone() {
        paymentMethodTextField.resignFirstResponder()
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    // MARK: - Email Functionality
    private func sendPaymentLinkEmail() {
        guard let clientEmail = appointment.clientEmail, !clientEmail.isEmpty else {
            showAlert(title: "Error", message: "No email address found for this client")
            return
        }
        
        let paymentLink = "\(ConfigurationManager.shared.paymentLinkBaseUrl)/\(appointment.id)"
        
        // Call the web API endpoint to send payment link email via Resend
        guard let url = URL(string: "\(ConfigurationManager.shared.apiBaseUrl)/email/send-payment-link") else {
            showAlert(title: "Error", message: "Invalid API URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "appointmentId": appointment.id,
            "clientEmail": clientEmail,
            "clientName": appointment.clientName,
            "amount": appointment.price,
            "serviceName": appointment.serviceName,
            "paymentLink": paymentLink,
            "businessId": appointment.businessId,
            "clientId": appointment.clientId
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            showAlert(title: "Error", message: "Failed to create request")
            return
        }
        
        // Show loading indicator
        let loadingAlert = UIAlertController(title: nil, message: "Sending payment link...", preferredStyle: .alert)
        let loadingIndicator = UIActivityIndicatorView(frame: CGRect(x: 10, y: 5, width: 50, height: 50))
        loadingIndicator.hidesWhenStopped = true
        loadingIndicator.style = .medium
        loadingIndicator.startAnimating()
        loadingAlert.view.addSubview(loadingIndicator)
        present(loadingAlert, animated: true)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                loadingAlert.dismiss(animated: true) {
                    if let error = error {
                        self?.showAlert(title: "Error", message: "Failed to send email: \(error.localizedDescription)")
                        return
                    }
                    
                    if let httpResponse = response as? HTTPURLResponse {
                        if httpResponse.statusCode == 200 {
                            if let data = data,
                               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                               let success = json["success"] as? Bool, success {
                                self?.showAlert(title: "Success", message: "Payment link sent to \(clientEmail)")
                            } else {
                                self?.showAlert(title: "Error", message: "Failed to send email. Please try again.")
                            }
                        } else {
                            // Try to parse error message
                            var errorMessage = "Failed to send email (Status: \(httpResponse.statusCode))"
                            if let data = data,
                               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                               let error = json["error"] as? String {
                                errorMessage = error
                            }
                            self?.showAlert(title: "Error", message: errorMessage)
                        }
                    } else {
                        self?.showAlert(title: "Error", message: "Invalid response from server")
                    }
                }
            }
        }.resume()
    }
    
    // MARK: - Helper Methods
    private func showAlert(title: String, message: String, completion: (() -> Void)? = nil) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completion?()
        })
        present(alert, animated: true)
    }
}

// MARK: - UITextViewDelegate
extension PaymentDetailViewController: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        if textView.text == "Payment reference, notes..." {
            textView.text = ""
            textView.textColor = ThemeManager.Colors.label
        }
    }
    
    func textViewDidEndEditing(_ textView: UITextView) {
        if textView.text.isEmpty {
            textView.text = "Payment reference, notes..."
            textView.textColor = ThemeManager.Colors.secondaryLabel
        }
    }
}

// MARK: - UITextFieldDelegate
extension PaymentDetailViewController: UITextFieldDelegate {
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        if textField == amountTextField {
            // Allow only numbers and decimal point
            let allowedCharacters = CharacterSet(charactersIn: "0123456789.")
            let characterSet = CharacterSet(charactersIn: string)
            return allowedCharacters.isSuperset(of: characterSet)
        }
        return true
    }
}

// MARK: - UIPickerViewDataSource & UIPickerViewDelegate
extension PaymentDetailViewController: UIPickerViewDataSource, UIPickerViewDelegate {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return 4
    }
    
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        let methods = ["Cash", "Bank Transfer", "Card Payment", "Voucher"]
        return methods[row]
    }
    
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        let methods = ["Cash", "Bank Transfer", "Card Payment", "Voucher"]
        paymentMethodTextField.text = methods[row]
    }
}