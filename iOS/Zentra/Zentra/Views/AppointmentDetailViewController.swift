//
//  AppointmentDetailViewController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit
import FirebaseFirestore

class AppointmentDetailViewController: UIViewController {
    
    // MARK: - Properties
    private var appointment: Appointment
    private let db = Firestore.firestore()
    private let loyaltyManager = LoyaltyManager.shared
    
    // MARK: - UI Elements
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Edit Appointment"
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
        let attributedString = NSMutableAttributedString(string: "Edit Appointment")
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
    
    // Client Info Section
    private let clientSectionLabel = UILabel()
    private let clientNameLabel = UILabel()
    private let clientEmailLabel = UILabel()
    
    // Service Info Section
    private let serviceSectionLabel = UILabel()
    private let serviceNameLabel = UILabel()
    private let serviceNameTextField = UITextField()
    private let durationLabel = UILabel()
    private let durationTextField = UITextField()
    private let bufferTimeLabel = UILabel()
    private let bufferTimeTextField = UITextField()
    private let priceLabel = UILabel()
    private let priceTextField = UITextField()
    
    // Date & Time Section
    private let dateSectionLabel = UILabel()
    private let dateTimeTextField = UITextField()
    private let datePicker = UIDatePicker()
    
    // Status Section
    private let statusSectionLabel = UILabel()
    private var appointmentStatusSegmentedControl = UISegmentedControl()
    
    // Payment Section
    private let paymentSectionLabel = UILabel()
    private var paymentStatusLabel: UILabel!
    private var paymentStatusSegmentedControl = UISegmentedControl()
    private var paymentMethodLabel: UILabel!
    private var paymentMethodSegmentedControl = UISegmentedControl()
    
    // Notes Section
    private let notesSectionLabel = UILabel()
    private let notesTextView = UITextView()
    
    // Action Buttons
    private let saveButton = UIButton()
    private let cancelButton = UIButton()
    
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
        populateFields()
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
        
        // Setup scroll view
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.backgroundColor = UIColor.clear
        contentView.translatesAutoresizingMaskIntoConstraints = false
        contentView.backgroundColor = UIColor.clear
        
        view.addSubview(titleLabel)
        view.addSubview(contentCard)
        contentCard.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        setupClientSection()
        setupServiceSection()
        setupDateSection()
        setupStatusSection()
        setupPaymentSection()
        setupNotesSection()
        setupActionButtons()
    }
    
    private func setupClientSection() {
        clientSectionLabel.text = "Client Information"
        clientSectionLabel.applyPrimaryTitleStyle()
        clientSectionLabel.translatesAutoresizingMaskIntoConstraints = false
        
        clientNameLabel.text = appointment.clientName
        clientNameLabel.applyBodyStyle()
        clientNameLabel.translatesAutoresizingMaskIntoConstraints = false
        
        clientEmailLabel.text = appointment.clientEmail ?? "No email"
        clientEmailLabel.applyCaptionStyle()
        clientEmailLabel.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(clientSectionLabel)
        contentView.addSubview(clientNameLabel)
        contentView.addSubview(clientEmailLabel)
    }
    
    private func setupServiceSection() {
        serviceSectionLabel.text = "Service Details"
        serviceSectionLabel.applyPrimaryTitleStyle()
        serviceSectionLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Service Name
        serviceNameLabel.text = "Service Name"
        serviceNameLabel.applyBodyStyle()
        serviceNameLabel.translatesAutoresizingMaskIntoConstraints = false
        
        serviceNameTextField.text = appointment.serviceName
        serviceNameTextField.borderStyle = .none
        serviceNameTextField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        serviceNameTextField.layer.cornerRadius = 16
        serviceNameTextField.font = ThemeManager.Typography.body
        serviceNameTextField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        serviceNameTextField.leftViewMode = .always
        serviceNameTextField.translatesAutoresizingMaskIntoConstraints = false
        
        // Duration
        durationLabel.text = "Duration (minutes)"
        durationLabel.applyBodyStyle()
        durationLabel.translatesAutoresizingMaskIntoConstraints = false
        
        durationTextField.text = "\(appointment.duration)"
        durationTextField.borderStyle = .none
        durationTextField.keyboardType = .numberPad
        durationTextField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        durationTextField.layer.cornerRadius = 16
        durationTextField.font = ThemeManager.Typography.body
        durationTextField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        durationTextField.leftViewMode = .always
        durationTextField.translatesAutoresizingMaskIntoConstraints = false
        
        // Buffer Time
        bufferTimeLabel.text = "Buffer Time (minutes)"
        bufferTimeLabel.applyBodyStyle()
        bufferTimeLabel.translatesAutoresizingMaskIntoConstraints = false
        
        bufferTimeTextField.text = "\(appointment.bufferTime)"
        bufferTimeTextField.borderStyle = .none
        bufferTimeTextField.keyboardType = .numberPad
        bufferTimeTextField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        bufferTimeTextField.layer.cornerRadius = 16
        bufferTimeTextField.font = ThemeManager.Typography.body
        bufferTimeTextField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        bufferTimeTextField.leftViewMode = .always
        bufferTimeTextField.translatesAutoresizingMaskIntoConstraints = false
        
        // Price
        priceLabel.text = "Price (£)"
        priceLabel.applyBodyStyle()
        priceLabel.translatesAutoresizingMaskIntoConstraints = false
        
        priceTextField.text = String(format: "%.2f", appointment.price)
        priceTextField.borderStyle = .none
        priceTextField.keyboardType = .decimalPad
        priceTextField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        priceTextField.layer.cornerRadius = 16
        priceTextField.font = ThemeManager.Typography.body
        priceTextField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        priceTextField.leftViewMode = .always
        priceTextField.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(serviceSectionLabel)
        contentView.addSubview(serviceNameLabel)
        contentView.addSubview(serviceNameTextField)
        contentView.addSubview(durationLabel)
        contentView.addSubview(durationTextField)
        contentView.addSubview(bufferTimeLabel)
        contentView.addSubview(bufferTimeTextField)
        contentView.addSubview(priceLabel)
        contentView.addSubview(priceTextField)
    }
    
    private func setupDateSection() {
        dateSectionLabel.text = "Date & Time"
        dateSectionLabel.applyPrimaryTitleStyle()
        dateSectionLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Setup date/time text field
        dateTimeTextField.text = formatDateTime(appointment.date)
        dateTimeTextField.borderStyle = .none
        dateTimeTextField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        dateTimeTextField.layer.cornerRadius = 16
        dateTimeTextField.font = ThemeManager.Typography.body
        dateTimeTextField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        dateTimeTextField.leftViewMode = .always
        dateTimeTextField.translatesAutoresizingMaskIntoConstraints = false
        
        // Setup date picker (hidden, used for input)
        datePicker.date = appointment.date
        datePicker.datePickerMode = .dateAndTime
        datePicker.preferredDatePickerStyle = .wheels
        datePicker.translatesAutoresizingMaskIntoConstraints = false
        
        // Set text field input view to date picker
        dateTimeTextField.inputView = datePicker
        
        // Add toolbar with done button
        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        let doneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(datePickerDoneTapped))
        let flexibleSpace = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        toolbar.items = [flexibleSpace, doneButton]
        dateTimeTextField.inputAccessoryView = toolbar
        
        contentView.addSubview(dateSectionLabel)
        contentView.addSubview(dateTimeTextField)
    }
    
    private func setupStatusSection() {
        statusSectionLabel.text = "Appointment Status"
        statusSectionLabel.applyPrimaryTitleStyle()
        statusSectionLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let statusItems = AppointmentStatus.allCases.map { $0.rawValue.capitalized }
        appointmentStatusSegmentedControl = UISegmentedControl(items: statusItems)
        appointmentStatusSegmentedControl.selectedSegmentIndex = AppointmentStatus.allCases.firstIndex(of: appointment.status) ?? 0
        appointmentStatusSegmentedControl.selectedSegmentTintColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        appointmentStatusSegmentedControl.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(statusSectionLabel)
        contentView.addSubview(appointmentStatusSegmentedControl)
    }
    
    private func setupPaymentSection() {
        paymentSectionLabel.text = "Payment Information"
        paymentSectionLabel.applyPrimaryTitleStyle()
        paymentSectionLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Payment Status
        let paymentStatusLabel = UILabel()
        paymentStatusLabel.text = "Payment Status"
        paymentStatusLabel.applyBodyStyle()
        paymentStatusLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let paymentStatusItems = PaymentStatus.allCases.map { $0.rawValue.capitalized }
        paymentStatusSegmentedControl = UISegmentedControl(items: paymentStatusItems)
        paymentStatusSegmentedControl.selectedSegmentIndex = PaymentStatus.allCases.firstIndex(of: appointment.payment?.status ?? .pending) ?? 0
        paymentStatusSegmentedControl.selectedSegmentTintColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        paymentStatusSegmentedControl.translatesAutoresizingMaskIntoConstraints = false
        
        // Payment Method
        let paymentMethodLabel = UILabel()
        paymentMethodLabel.text = "Payment Method"
        paymentMethodLabel.applyBodyStyle()
        paymentMethodLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let paymentMethodItems = PaymentMethod.allCases.map { $0.rawValue.replacingOccurrences(of: "([a-z])([A-Z])", with: "$1 $2", options: .regularExpression).capitalized }
        paymentMethodSegmentedControl = UISegmentedControl(items: paymentMethodItems)
        if let paymentMethod = appointment.payment?.method,
           let method = PaymentMethod(rawValue: paymentMethod) {
            paymentMethodSegmentedControl.selectedSegmentIndex = PaymentMethod.allCases.firstIndex(of: method) ?? 0
        } else {
            paymentMethodSegmentedControl.selectedSegmentIndex = 0
        }
        paymentMethodSegmentedControl.selectedSegmentTintColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        paymentMethodSegmentedControl.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(paymentSectionLabel)
        contentView.addSubview(paymentStatusLabel)
        contentView.addSubview(paymentStatusSegmentedControl)
        contentView.addSubview(paymentMethodLabel)
        contentView.addSubview(paymentMethodSegmentedControl)
        
        // Store labels for constraints
        self.paymentStatusLabel = paymentStatusLabel
        self.paymentMethodLabel = paymentMethodLabel
    }
    
    private func setupNotesSection() {
        notesSectionLabel.text = "Notes"
        notesSectionLabel.applyPrimaryTitleStyle()
        notesSectionLabel.translatesAutoresizingMaskIntoConstraints = false
        
        notesTextView.text = appointment.notes ?? ""
        notesTextView.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        notesTextView.layer.cornerRadius = 16
        notesTextView.font = ThemeManager.Typography.body
        notesTextView.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        notesTextView.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(notesSectionLabel)
        contentView.addSubview(notesTextView)
    }
    
    private func setupActionButtons() {
        saveButton.setTitle("Save Changes", for: .normal)
        saveButton.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.backgroundColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        saveButton.layer.cornerRadius = 20
        saveButton.layer.shadowColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 0.5).cgColor
        saveButton.layer.shadowOffset = CGSize(width: 0, height: 8)
        saveButton.layer.shadowRadius = 16
        saveButton.layer.shadowOpacity = 0.4
        saveButton.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        saveButton.translatesAutoresizingMaskIntoConstraints = false
        
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        cancelButton.setTitleColor(UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0), for: .normal)
        cancelButton.backgroundColor = UIColor.white
        cancelButton.layer.cornerRadius = 20
        cancelButton.layer.borderWidth = 2
        cancelButton.layer.borderColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0).cgColor
        cancelButton.addTarget(self, action: #selector(cancelButtonTapped), for: .touchUpInside)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(saveButton)
        contentView.addSubview(cancelButton)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Title Label
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            
            // Content Card
            contentCard.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 24),
            contentCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            contentCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            contentCard.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            
            // Scroll View
            scrollView.topAnchor.constraint(equalTo: contentCard.topAnchor, constant: 20),
            scrollView.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: contentCard.bottomAnchor, constant: -20),
            
            // Content View
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            contentView.heightAnchor.constraint(greaterThanOrEqualTo: scrollView.heightAnchor),
            
            // Client Section
            clientSectionLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            clientSectionLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            clientSectionLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            clientNameLabel.topAnchor.constraint(equalTo: clientSectionLabel.bottomAnchor, constant: 8),
            clientNameLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            clientNameLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            clientEmailLabel.topAnchor.constraint(equalTo: clientNameLabel.bottomAnchor, constant: 4),
            clientEmailLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            clientEmailLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Service Section
            serviceSectionLabel.topAnchor.constraint(equalTo: clientEmailLabel.bottomAnchor, constant: 30),
            serviceSectionLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            serviceSectionLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Service Name
            serviceNameLabel.topAnchor.constraint(equalTo: serviceSectionLabel.bottomAnchor, constant: 8),
            serviceNameLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            serviceNameLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            serviceNameTextField.topAnchor.constraint(equalTo: serviceNameLabel.bottomAnchor, constant: 4),
            serviceNameTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            serviceNameTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            serviceNameTextField.heightAnchor.constraint(equalToConstant: 44),
            
            // Duration
            durationLabel.topAnchor.constraint(equalTo: serviceNameTextField.bottomAnchor, constant: 16),
            durationLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            durationLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            durationTextField.topAnchor.constraint(equalTo: durationLabel.bottomAnchor, constant: 4),
            durationTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            durationTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            durationTextField.heightAnchor.constraint(equalToConstant: 44),
            
            // Buffer Time
            bufferTimeLabel.topAnchor.constraint(equalTo: durationTextField.bottomAnchor, constant: 16),
            bufferTimeLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            bufferTimeLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            bufferTimeTextField.topAnchor.constraint(equalTo: bufferTimeLabel.bottomAnchor, constant: 4),
            bufferTimeTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            bufferTimeTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            bufferTimeTextField.heightAnchor.constraint(equalToConstant: 44),
            
            // Price
            priceLabel.topAnchor.constraint(equalTo: bufferTimeTextField.bottomAnchor, constant: 16),
            priceLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            priceLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            priceTextField.topAnchor.constraint(equalTo: priceLabel.bottomAnchor, constant: 4),
            priceTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            priceTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            priceTextField.heightAnchor.constraint(equalToConstant: 44),
            
            // Date Section
            dateSectionLabel.topAnchor.constraint(equalTo: priceTextField.bottomAnchor, constant: 30),
            dateSectionLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            dateSectionLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            dateTimeTextField.topAnchor.constraint(equalTo: dateSectionLabel.bottomAnchor, constant: 8),
            dateTimeTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            dateTimeTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            dateTimeTextField.heightAnchor.constraint(equalToConstant: 44),
            
            // Status Section
            statusSectionLabel.topAnchor.constraint(equalTo: dateTimeTextField.bottomAnchor, constant: 30),
            statusSectionLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            statusSectionLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            appointmentStatusSegmentedControl.topAnchor.constraint(equalTo: statusSectionLabel.bottomAnchor, constant: 8),
            appointmentStatusSegmentedControl.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            appointmentStatusSegmentedControl.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Payment Section
            paymentSectionLabel.topAnchor.constraint(equalTo: appointmentStatusSegmentedControl.bottomAnchor, constant: 30),
            paymentSectionLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentSectionLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentStatusLabel.topAnchor.constraint(equalTo: paymentSectionLabel.bottomAnchor, constant: 16),
            paymentStatusLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentStatusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentStatusSegmentedControl.topAnchor.constraint(equalTo: paymentStatusLabel.bottomAnchor, constant: 8),
            paymentStatusSegmentedControl.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentStatusSegmentedControl.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentMethodLabel.topAnchor.constraint(equalTo: paymentStatusSegmentedControl.bottomAnchor, constant: 16),
            paymentMethodLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentMethodLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentMethodSegmentedControl.topAnchor.constraint(equalTo: paymentMethodLabel.bottomAnchor, constant: 8),
            paymentMethodSegmentedControl.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentMethodSegmentedControl.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Notes Section
            notesSectionLabel.topAnchor.constraint(equalTo: paymentMethodSegmentedControl.bottomAnchor, constant: 30),
            notesSectionLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            notesSectionLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            notesTextView.topAnchor.constraint(equalTo: notesSectionLabel.bottomAnchor, constant: 8),
            notesTextView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            notesTextView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            notesTextView.heightAnchor.constraint(equalToConstant: 100),
            
            // Action Buttons
            saveButton.topAnchor.constraint(equalTo: notesTextView.bottomAnchor, constant: 30),
            saveButton.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            saveButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            saveButton.heightAnchor.constraint(equalToConstant: 50),
            
            cancelButton.topAnchor.constraint(equalTo: saveButton.bottomAnchor, constant: 16),
            cancelButton.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            cancelButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            cancelButton.heightAnchor.constraint(equalToConstant: 50),
            cancelButton.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -20)
        ])
    }
    
    private func populateFields() {
        // Fields are populated in setup methods
    }
    
    // MARK: - Actions
    @objc private func saveButtonTapped() {
        guard let durationText = durationTextField.text,
              let duration = Int(durationText),
              let bufferTimeText = bufferTimeTextField.text,
              let bufferTime = Int(bufferTimeText),
              let priceText = priceTextField.text,
              let price = Double(priceText) else {
            showAlert(title: "Error", message: "Please fill in all required fields with valid values.")
            return
        }
        
        let selectedStatus = AppointmentStatus.allCases[appointmentStatusSegmentedControl.selectedSegmentIndex]
        let selectedPaymentStatus = PaymentStatus.allCases[paymentStatusSegmentedControl.selectedSegmentIndex]
        let selectedPaymentMethod = PaymentMethod.allCases[paymentMethodSegmentedControl.selectedSegmentIndex]
        
        let updatedPayment = PaymentInfo(
            status: selectedPaymentStatus,
            amount: price,
            method: selectedPaymentMethod.rawValue,
            transactionId: appointment.payment?.transactionId,
            paidAt: selectedPaymentStatus == .paid ? Date() : appointment.payment?.paidAt,
            depositRequired: appointment.payment?.depositRequired,
            depositPercentage: appointment.payment?.depositPercentage,
            depositPaid: appointment.payment?.depositPaid,
            remainingBalance: appointment.payment?.remainingBalance ?? (selectedPaymentStatus == .paid ? 0 : price)
        )
        
        let updatedAppointment = Appointment(
            id: appointment.id,
            clientId: appointment.clientId,
            clientName: appointment.clientName,
            clientEmail: appointment.clientEmail,
            serviceName: serviceNameTextField.text ?? appointment.serviceName,
            serviceId: appointment.serviceId,
            serviceCategory: appointment.serviceCategory,
            staffId: appointment.staffId,
            staffName: appointment.staffName,
            locationId: appointment.locationId,
            locationName: appointment.locationName,
            date: datePicker.date,
            duration: duration,
            bufferTime: bufferTime,
            price: price,
            status: selectedStatus,
            payment: updatedPayment,
            notes: notesTextView.text.isEmpty ? nil : notesTextView.text,
            businessId: appointment.businessId,
            createdAt: appointment.createdAt
        )
        
        updateAppointment(updatedAppointment)
    }
    
    @objc private func cancelButtonTapped() {
        navigationController?.popViewController(animated: true)
    }
    
    @objc private func datePickerDoneTapped() {
        dateTimeTextField.text = formatDateTime(datePicker.date)
        dateTimeTextField.resignFirstResponder()
    }
    
    // MARK: - Helper Methods
    private func formatDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func updateAppointment(_ updatedAppointment: Appointment) {
        let docRef = db.collection("appointments").document(updatedAppointment.id)
        
        // Check if status is changing to completed
        let wasCompleted = appointment.status == .completed
        let isNowCompleted = updatedAppointment.status == .completed
        
        // Check if we should award loyalty points before updating
        let shouldAwardPoints = isNowCompleted && !wasCompleted && !updatedAppointment.clientId.isEmpty
        
        if shouldAwardPoints {
            // Check if loyalty already awarded before updating
            docRef.getDocument { [weak self] document, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self?.showAlert(title: "Error", message: "Failed to check appointment status: \(error.localizedDescription)")
                    }
                    return
                }
                
                let loyaltyAlreadyAwarded = document?.data()?["loyaltyAwarded"] as? Bool ?? false
                
                if loyaltyAlreadyAwarded {
                    // Just update the appointment without awarding points
                    self?.updateAppointmentDocument(updatedAppointment)
                } else {
                    // Update appointment and award points
                    self?.updateAppointmentDocument(updatedAppointment) { [weak self] in
                        self?.handleLoyaltyPointsAward(for: updatedAppointment)
                    }
                }
            }
        } else {
            // Just update the appointment
            updateAppointmentDocument(updatedAppointment)
        }
    }
    
    private func updateAppointmentDocument(_ updatedAppointment: Appointment, completion: (() -> Void)? = nil) {
        let docRef = db.collection("appointments").document(updatedAppointment.id)
        
        docRef.setData(updatedAppointment.dictionary) { [weak self] error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.showAlert(title: "Error", message: "Failed to update appointment: \(error.localizedDescription)")
                } else {
                    completion?()
                    if completion == nil {
                        self?.showAlert(title: "Success", message: "Appointment updated successfully") {
                            self?.navigationController?.popViewController(animated: true)
                        }
                    }
                }
            }
        }
    }
    
    private func handleLoyaltyPointsAward(for appointment: Appointment) {
        Task {
            do {
                
                // Check if customer used points/rewards (would be in appointment data if applicable)
                // For now, we'll award points. This can be enhanced later to check for used points.
                
                // Award loyalty points
                let loyaltyResult = try await loyaltyManager.awardLoyaltyPoints(
                    businessId: appointment.businessId,
                    clientId: appointment.clientId,
                    appointmentAmount: appointment.price,
                    appointmentId: appointment.id
                )
                
                // Award referral bonus if applicable
                let referralResult = try await loyaltyManager.awardReferralBonus(
                    businessId: appointment.businessId,
                    refereeClientId: appointment.clientId,
                    appointmentId: appointment.id
                )
                
                // Update client stats (total spent, last visit)
                try await loyaltyManager.updateClientStats(
                    clientId: appointment.clientId,
                    amount: appointment.price
                )
                
                // Show success message with points info
                await MainActor.run {
                    var message = "Appointment updated successfully"
                    if loyaltyResult.success {
                        message += "\n\nAwarded \(loyaltyResult.pointsAwarded) loyalty points to client"
                    }
                    if referralResult.success {
                        message += "\n\nAwarded \(referralResult.pointsAwarded) referral bonus points"
                    }
                    
                    self.showAlert(title: "Success", message: message) {
                        self.navigationController?.popViewController(animated: true)
                    }
                }
            } catch {
                await MainActor.run {
                    // Still show success for appointment update, but note loyalty error
                    self.showAlert(title: "Success", message: "Appointment updated successfully. Note: There was an issue awarding loyalty points: \(error.localizedDescription)") {
                        self.navigationController?.popViewController(animated: true)
                    }
                }
            }
        }
    }
    
    private func showAlert(title: String, message: String, completion: (() -> Void)? = nil) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completion?()
        })
        present(alert, animated: true)
    }
}

