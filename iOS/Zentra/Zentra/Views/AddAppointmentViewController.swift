//
//  AddAppointmentViewController.swift
//  Zentra
//
//  Created by James Clark on 26/10/2025.
//

import UIKit
import FirebaseFirestore

class AddAppointmentViewController: UIViewController {
    
    // MARK: - Properties
    private let businessId: String
    private let defaultDate: Date?
    private let db = Firestore.firestore()
    
    // Data arrays
    private var clients: [Client] = []
    private var services: [Service] = []
    private var servicesGroupedByCategory: [String: [Service]] = [:]
    private var categoryOrder: [String] = []
    private var flatServiceList: [PickerItem] = [] // For picker display
    private var locations: [Location] = []
    private var staff: [Staff] = []
    private var filteredClients: [Client] = []
    
    // Selected values
    private var selectedClient: Client?
    private var selectedService: Service?
    private var selectedLocation: Location?
    private var selectedStaff: Staff?
    private var selectedStatus: AppointmentStatus = .confirmed
    private var selectedPaymentStatus: PaymentStatus = .pending
    private var selectedPaymentMethod: PaymentMethod = .cash
    
    // Flag to prevent text change handler from running when programmatically setting text
    private var isProgrammaticallySettingClientText = false
    
    // Pickers
    private let servicePicker = UIPickerView()
    private let locationPicker = UIPickerView()
    private let staffPicker = UIPickerView()
    private let statusPicker = UIPickerView()
    private let paymentStatusPicker = UIPickerView()
    private let paymentMethodPicker = UIPickerView()
    
    // Client selection table view
    private let clientTableView: UITableView = {
        let tableView = UITableView()
        tableView.backgroundColor = .white
        tableView.layer.cornerRadius = ThemeManager.CornerRadius.small
        tableView.layer.borderWidth = 1
        tableView.layer.borderColor = ThemeManager.Colors.separator.cgColor
        tableView.isHidden = true
        tableView.translatesAutoresizingMaskIntoConstraints = false
        return tableView
    }()
    
    // MARK: - UI Elements
    private let scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        return scrollView
    }()
    
    private let contentView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    // Client Field
    private let clientLabel: UILabel = {
        let label = UILabel()
        label.text = "Client"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let clientSearchTextField: UITextField = {
        let textField = UITextField()
        textField.placeholder = "Search clients..."
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.leftViewMode = .always
        let searchIcon = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        searchIcon.tintColor = ThemeManager.Colors.secondaryLabel
        searchIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let leftView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        leftView.addSubview(searchIcon)
        searchIcon.center = leftView.center
        textField.leftView = leftView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private let addNewClientButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("+ Add New", for: .normal)
        button.backgroundColor = ThemeManager.Colors.primary
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = ThemeManager.CornerRadius.small
        button.titleLabel?.font = ThemeManager.Typography.body
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    // Service Field
    private let serviceLabel: UILabel = {
        let label = UILabel()
        label.text = "Service"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let serviceTextField: UITextField = {
        let textField = UITextField()
        textField.placeholder = "Select a service"
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let arrowIcon = UIImageView(image: UIImage(systemName: "chevron.down"))
        arrowIcon.tintColor = ThemeManager.Colors.secondaryLabel
        arrowIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(arrowIcon)
        arrowIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    // Location Field
    private let locationLabel: UILabel = {
        let label = UILabel()
        label.text = "Location"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let locationTextField: UITextField = {
        let textField = UITextField()
        textField.placeholder = "Select a location"
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let arrowIcon = UIImageView(image: UIImage(systemName: "chevron.down"))
        arrowIcon.tintColor = ThemeManager.Colors.secondaryLabel
        arrowIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(arrowIcon)
        arrowIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    // Staff Member Field
    private let staffLabel: UILabel = {
        let label = UILabel()
        label.text = "Staff Member"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let staffTextField: UITextField = {
        let textField = UITextField()
        textField.text = "Any Staff"
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let arrowIcon = UIImageView(image: UIImage(systemName: "chevron.down"))
        arrowIcon.tintColor = ThemeManager.Colors.secondaryLabel
        arrowIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(arrowIcon)
        arrowIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    // Date Field
    private let dateLabel: UILabel = {
        let label = UILabel()
        label.text = "Date"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let dateTextField: UITextField = {
        let textField = UITextField()
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let calendarIcon = UIImageView(image: UIImage(systemName: "calendar"))
        calendarIcon.tintColor = ThemeManager.Colors.secondaryLabel
        calendarIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(calendarIcon)
        calendarIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private let datePicker: UIDatePicker = {
        let picker = UIDatePicker()
        picker.datePickerMode = .date
        picker.preferredDatePickerStyle = .wheels
        picker.minimumDate = Date()
        picker.translatesAutoresizingMaskIntoConstraints = false
        return picker
    }()
    
    // Time Field
    private let timeLabel: UILabel = {
        let label = UILabel()
        label.text = "Time"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let timeTextField: UITextField = {
        let textField = UITextField()
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let clockIcon = UIImageView(image: UIImage(systemName: "clock"))
        clockIcon.tintColor = ThemeManager.Colors.secondaryLabel
        clockIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(clockIcon)
        clockIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private let timePicker: UIDatePicker = {
        let picker = UIDatePicker()
        picker.datePickerMode = .time
        picker.preferredDatePickerStyle = .wheels
        picker.translatesAutoresizingMaskIntoConstraints = false
        return picker
    }()
    
    // Status Field
    private let statusLabel: UILabel = {
        let label = UILabel()
        label.text = "Status"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let statusTextField: UITextField = {
        let textField = UITextField()
        textField.text = "Confirmed"
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let arrowIcon = UIImageView(image: UIImage(systemName: "chevron.down"))
        arrowIcon.tintColor = ThemeManager.Colors.secondaryLabel
        arrowIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(arrowIcon)
        arrowIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    // Payment Status Field
    private let paymentStatusLabel: UILabel = {
        let label = UILabel()
        label.text = "Payment Status"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let paymentStatusTextField: UITextField = {
        let textField = UITextField()
        textField.text = "Pending"
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let arrowIcon = UIImageView(image: UIImage(systemName: "chevron.down"))
        arrowIcon.tintColor = ThemeManager.Colors.secondaryLabel
        arrowIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(arrowIcon)
        arrowIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    // Payment Method Field
    private let paymentMethodLabel: UILabel = {
        let label = UILabel()
        label.text = "Payment Method"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let paymentMethodTextField: UITextField = {
        let textField = UITextField()
        textField.text = "Cash"
        textField.borderStyle = .roundedRect
        textField.backgroundColor = .white
        textField.layer.cornerRadius = ThemeManager.CornerRadius.small
        textField.layer.borderWidth = 1
        textField.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textField.rightViewMode = .always
        let arrowIcon = UIImageView(image: UIImage(systemName: "chevron.down"))
        arrowIcon.tintColor = ThemeManager.Colors.secondaryLabel
        arrowIcon.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
        let rightView = UIView(frame: CGRect(x: 0, y: 0, width: 36, height: 44))
        rightView.addSubview(arrowIcon)
        arrowIcon.center = rightView.center
        textField.rightView = rightView
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    // Notes Field
    private let notesLabel: UILabel = {
        let label = UILabel()
        label.text = "Notes"
        label.font = ThemeManager.Typography.title3
        label.textColor = ThemeManager.Colors.label
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let notesTextView: UITextView = {
        let textView = UITextView()
        textView.text = "Add any notes about this appointment..."
        textView.textColor = ThemeManager.Colors.secondaryLabel
        textView.backgroundColor = .white
        textView.layer.cornerRadius = ThemeManager.CornerRadius.small
        textView.layer.borderWidth = 1
        textView.layer.borderColor = ThemeManager.Colors.separator.cgColor
        textView.font = ThemeManager.Typography.body
        textView.translatesAutoresizingMaskIntoConstraints = false
        return textView
    }()
    
    // Action Buttons
    private let cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel", for: .normal)
        button.setTitleColor(ThemeManager.Colors.label, for: .normal)
        button.titleLabel?.font = ThemeManager.Typography.title3
        button.backgroundColor = .white
        button.layer.cornerRadius = ThemeManager.CornerRadius.medium
        button.layer.borderWidth = 1
        button.layer.borderColor = ThemeManager.Colors.separator.cgColor
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private let createButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Create Appointment", for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = ThemeManager.Typography.title3
        button.backgroundColor = ThemeManager.Colors.primary
        button.layer.cornerRadius = ThemeManager.CornerRadius.medium
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    // Date and Time Formatters
    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter
    }()
    
    private let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter
    }()
    
    // MARK: - Initialization
    init(businessId: String, defaultDate: Date? = nil) {
        self.businessId = businessId
        self.defaultDate = defaultDate
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
        setupPickers()
        fetchData()
        
        // Set default date if provided
        if let defaultDate = defaultDate {
            datePicker.date = defaultDate
            updateDateField()
        } else {
            updateDateField()
        }
        
        // Set default time to 09:00
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: Date())
        components.hour = 9
        components.minute = 0
        if let defaultTime = calendar.date(from: components) {
            timePicker.date = defaultTime
            updateTimeField()
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Refresh clients when view appears (in case a new client was added)
        fetchClients()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientBackground()
    }
    
    // MARK: - Setup
    private func setupUI() {
        title = "New Appointment"
        
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        contentView.addSubview(clientLabel)
        contentView.addSubview(clientSearchTextField)
        contentView.addSubview(addNewClientButton)
        contentView.addSubview(serviceLabel)
        contentView.addSubview(serviceTextField)
        contentView.addSubview(locationLabel)
        contentView.addSubview(locationTextField)
        contentView.addSubview(staffLabel)
        contentView.addSubview(staffTextField)
        contentView.addSubview(dateLabel)
        contentView.addSubview(dateTextField)
        contentView.addSubview(timeLabel)
        contentView.addSubview(timeTextField)
        contentView.addSubview(statusLabel)
        contentView.addSubview(statusTextField)
        contentView.addSubview(paymentStatusLabel)
        contentView.addSubview(paymentStatusTextField)
        contentView.addSubview(paymentMethodLabel)
        contentView.addSubview(paymentMethodTextField)
        contentView.addSubview(notesLabel)
        contentView.addSubview(notesTextView)
        contentView.addSubview(cancelButton)
        contentView.addSubview(createButton)
        contentView.addSubview(clientTableView)
        
        notesTextView.delegate = self
        clientSearchTextField.addTarget(self, action: #selector(clientSearchChanged), for: .editingChanged)
        clientSearchTextField.addTarget(self, action: #selector(clientSearchDidBegin), for: .editingDidBegin)
        
        // Setup pickers
        servicePicker.delegate = self
        servicePicker.dataSource = self
        locationPicker.delegate = self
        locationPicker.dataSource = self
        staffPicker.delegate = self
        staffPicker.dataSource = self
        statusPicker.delegate = self
        statusPicker.dataSource = self
        paymentStatusPicker.delegate = self
        paymentStatusPicker.dataSource = self
        paymentMethodPicker.delegate = self
        paymentMethodPicker.dataSource = self
        
        serviceTextField.inputView = servicePicker
        locationTextField.inputView = locationPicker
        staffTextField.inputView = staffPicker
        statusTextField.inputView = statusPicker
        paymentStatusTextField.inputView = paymentStatusPicker
        paymentMethodTextField.inputView = paymentMethodPicker
        
        // Setup table view
        clientTableView.delegate = self
        clientTableView.dataSource = self
        clientTableView.register(UITableViewCell.self, forCellReuseIdentifier: "ClientCell")
    }
    
    private func setupConstraints() {
        let spacing: CGFloat = 16
        let fieldHeight: CGFloat = 44
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            
            clientLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 20),
            clientLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            clientLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            clientSearchTextField.topAnchor.constraint(equalTo: clientLabel.bottomAnchor, constant: 8),
            clientSearchTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            clientSearchTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            addNewClientButton.centerYAnchor.constraint(equalTo: clientSearchTextField.centerYAnchor),
            addNewClientButton.leadingAnchor.constraint(equalTo: clientSearchTextField.trailingAnchor, constant: 8),
            addNewClientButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            addNewClientButton.widthAnchor.constraint(equalToConstant: 100),
            addNewClientButton.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            serviceLabel.topAnchor.constraint(equalTo: clientSearchTextField.bottomAnchor, constant: spacing),
            serviceLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            serviceLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            serviceTextField.topAnchor.constraint(equalTo: serviceLabel.bottomAnchor, constant: 8),
            serviceTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            serviceTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            serviceTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            locationLabel.topAnchor.constraint(equalTo: serviceTextField.bottomAnchor, constant: spacing),
            locationLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            locationLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            locationTextField.topAnchor.constraint(equalTo: locationLabel.bottomAnchor, constant: 8),
            locationTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            locationTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            locationTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            staffLabel.topAnchor.constraint(equalTo: locationTextField.bottomAnchor, constant: spacing),
            staffLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            staffLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            staffTextField.topAnchor.constraint(equalTo: staffLabel.bottomAnchor, constant: 8),
            staffTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            staffTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            staffTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            dateLabel.topAnchor.constraint(equalTo: staffTextField.bottomAnchor, constant: spacing),
            dateLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            dateLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            dateTextField.topAnchor.constraint(equalTo: dateLabel.bottomAnchor, constant: 8),
            dateTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            dateTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            dateTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            timeLabel.topAnchor.constraint(equalTo: dateTextField.bottomAnchor, constant: spacing),
            timeLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            timeLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            timeTextField.topAnchor.constraint(equalTo: timeLabel.bottomAnchor, constant: 8),
            timeTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            timeTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            timeTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            statusLabel.topAnchor.constraint(equalTo: timeTextField.bottomAnchor, constant: spacing),
            statusLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            statusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            statusTextField.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 8),
            statusTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            statusTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            statusTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            paymentStatusLabel.topAnchor.constraint(equalTo: statusTextField.bottomAnchor, constant: spacing),
            paymentStatusLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentStatusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentStatusTextField.topAnchor.constraint(equalTo: paymentStatusLabel.bottomAnchor, constant: 8),
            paymentStatusTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentStatusTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            paymentStatusTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            paymentMethodLabel.topAnchor.constraint(equalTo: paymentStatusTextField.bottomAnchor, constant: spacing),
            paymentMethodLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentMethodLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            paymentMethodTextField.topAnchor.constraint(equalTo: paymentMethodLabel.bottomAnchor, constant: 8),
            paymentMethodTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            paymentMethodTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            paymentMethodTextField.heightAnchor.constraint(equalToConstant: fieldHeight),
            
            notesLabel.topAnchor.constraint(equalTo: paymentMethodTextField.bottomAnchor, constant: spacing),
            notesLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            notesLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            notesTextView.topAnchor.constraint(equalTo: notesLabel.bottomAnchor, constant: 8),
            notesTextView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            notesTextView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            notesTextView.heightAnchor.constraint(equalToConstant: 100),
            
            cancelButton.topAnchor.constraint(equalTo: notesTextView.bottomAnchor, constant: 32),
            cancelButton.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            cancelButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            cancelButton.heightAnchor.constraint(equalToConstant: 50),
            
            createButton.topAnchor.constraint(equalTo: cancelButton.bottomAnchor, constant: 16),
            createButton.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            createButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            createButton.heightAnchor.constraint(equalToConstant: 50),
            createButton.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -20),
            
            clientTableView.topAnchor.constraint(equalTo: clientSearchTextField.bottomAnchor, constant: 4),
            clientTableView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            clientTableView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            clientTableView.heightAnchor.constraint(equalToConstant: 200)
        ])
    }
    
    private func setupActions() {
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        createButton.addTarget(self, action: #selector(createTapped), for: .touchUpInside)
        addNewClientButton.addTarget(self, action: #selector(addNewClientTapped), for: .touchUpInside)
        
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        tapGesture.delegate = self
        view.addGestureRecognizer(tapGesture)
    }
    
    private func setupPickers() {
        dateTextField.inputView = datePicker
        timeTextField.inputView = timePicker
        
        let dateToolbar = UIToolbar()
        dateToolbar.sizeToFit()
        let dateDoneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(datePickerDone))
        dateToolbar.setItems([dateDoneButton], animated: true)
        dateTextField.inputAccessoryView = dateToolbar
        
        let timeToolbar = UIToolbar()
        timeToolbar.sizeToFit()
        let timeDoneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(timePickerDone))
        timeToolbar.setItems([timeDoneButton], animated: true)
        timeTextField.inputAccessoryView = timeToolbar
        
        // Add toolbars for all pickers
        let pickerToolbar = UIToolbar()
        pickerToolbar.sizeToFit()
        let pickerDoneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(pickerDone))
        pickerToolbar.setItems([pickerDoneButton], animated: true)
        
        serviceTextField.inputAccessoryView = pickerToolbar
        locationTextField.inputAccessoryView = pickerToolbar
        staffTextField.inputAccessoryView = pickerToolbar
        statusTextField.inputAccessoryView = pickerToolbar
        paymentStatusTextField.inputAccessoryView = pickerToolbar
        paymentMethodTextField.inputAccessoryView = pickerToolbar
        
        datePicker.addTarget(self, action: #selector(dateChanged), for: .valueChanged)
        timePicker.addTarget(self, action: #selector(timeChanged), for: .valueChanged)
    }
    
    // MARK: - Data Fetching
    private func fetchData() {
        fetchClients()
        fetchServices()
        fetchLocations()
        fetchStaff()
    }
    
    private func fetchClients() {
        db.collection("clients")
            .whereField("businessId", isEqualTo: businessId)
            .getDocuments { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("Error fetching clients: \(error.localizedDescription)")
                        return
                    }
                    
                    guard let documents = snapshot?.documents else { return }
                    self?.clients = documents.compactMap { doc in
                        Client(from: doc.data(), id: doc.documentID)
                    }
                    self?.filteredClients = self?.clients ?? []
                    print("Fetched \(self?.clients.count ?? 0) clients")
                }
            }
    }
    
    private func fetchServices() {
        db.collection("services")
            .whereField("businessId", isEqualTo: businessId)
            .whereField("active", isEqualTo: true)
            .getDocuments { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("Error fetching services: \(error.localizedDescription)")
                        return
                    }
                    
                    guard let documents = snapshot?.documents else { return }
                    self?.services = documents.compactMap { doc in
                        Service(from: doc.data(), id: doc.documentID)
                    }
                    
                    // Group services by category
                    self?.groupServicesByCategory()
                    
                    print("Fetched \(self?.services.count ?? 0) services")
                }
            }
    }
    
    private func groupServicesByCategory() {
        // Reset grouped data
        servicesGroupedByCategory = [:]
        flatServiceList = []
        
        // Group services by category
        var grouped: [String: [Service]] = [:]
        var uncategorized: [Service] = []
        
        for service in services {
            if let category = service.category, !category.isEmpty {
                if grouped[category] == nil {
                    grouped[category] = []
                }
                grouped[category]?.append(service)
            } else {
                uncategorized.append(service)
            }
        }
        
        // Add uncategorized services if any
        if !uncategorized.isEmpty {
            grouped["Other"] = uncategorized
        }
        
        // Sort categories alphabetically (but put "Other" at the end if it exists)
        var sortedCategories = grouped.keys.filter { $0 != "Other" }.sorted()
        if grouped["Other"] != nil {
            sortedCategories.append("Other")
        }
        
        // Store grouped data
        servicesGroupedByCategory = grouped
        categoryOrder = sortedCategories
        
        // Build flat list for picker (category headers + services)
        for category in sortedCategories {
            if let categoryServices = grouped[category], !categoryServices.isEmpty {
                // Add category header
                flatServiceList.append(.category(category))
                // Add services in this category (sorted alphabetically)
                for service in categoryServices.sorted(by: { $0.name < $1.name }) {
                    flatServiceList.append(.service(service))
                }
            }
        }
    }
    
    private func fetchLocations() {
        db.collection("locations")
            .whereField("businessId", isEqualTo: businessId)
            .getDocuments { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("Error fetching locations: \(error.localizedDescription)")
                        return
                    }
                    
                    guard let documents = snapshot?.documents else { return }
                    self?.locations = documents.compactMap { doc in
                        Location(from: doc.data(), id: doc.documentID)
                    }
                    print("Fetched \(self?.locations.count ?? 0) locations")
                    
                    // Auto-select if only one location
                    if self?.locations.count == 1, let location = self?.locations.first {
                        self?.selectedLocation = location
                        self?.locationTextField.text = location.name
                    }
                }
            }
    }
    
    private func fetchStaff() {
        db.collection("staff")
            .whereField("businessId", isEqualTo: businessId)
            .getDocuments { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("Error fetching staff: \(error.localizedDescription)")
                        return
                    }
                    
                    guard let documents = snapshot?.documents else { return }
                    self?.staff = documents.compactMap { doc in
                        Staff(from: doc.data(), id: doc.documentID)
                    }
                    print("Fetched \(self?.staff.count ?? 0) staff members")
                    
                    // Auto-select if only one staff member (skip "Any Staff" option)
                    if self?.staff.count == 1, let staffMember = self?.staff.first {
                        self?.selectedStaff = staffMember
                        self?.staffTextField.text = staffMember.name
                    }
                }
            }
    }
    
    // MARK: - Actions
    @objc private func cancelTapped() {
        dismiss(animated: true)
    }
    
    @objc private func createTapped() {
        guard validateFields() else { return }
        
        let calendar = Calendar.current
        let dateComponents = calendar.dateComponents([.year, .month, .day], from: datePicker.date)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: timePicker.date)
        
        var combinedComponents = DateComponents()
        combinedComponents.year = dateComponents.year
        combinedComponents.month = dateComponents.month
        combinedComponents.day = dateComponents.day
        combinedComponents.hour = timeComponents.hour
        combinedComponents.minute = timeComponents.minute
        combinedComponents.timeZone = TimeZone.current
        
        guard let appointmentDate = calendar.date(from: combinedComponents) else {
            showAlert(title: "Error", message: "Invalid date/time combination")
            return
        }
        
        // Debug: Print the appointment date to verify time is correct
        let debugFormatter = DateFormatter()
        debugFormatter.dateStyle = .medium
        debugFormatter.timeStyle = .medium
        print("AddAppointmentViewController: Creating appointment with date: \(debugFormatter.string(from: appointmentDate))")
        
        createAppointment(date: appointmentDate)
    }
    
    @objc private func addNewClientTapped() {
        let addClientVC = AddClientViewController(businessId: businessId, clientManager: ClientManager(businessId: businessId))
        let navController = UINavigationController(rootViewController: addClientVC)
        present(navController, animated: true)
    }
    
    @objc private func clientSearchChanged() {
        // Skip if we're programmatically setting the text
        guard !isProgrammaticallySettingClientText else {
            return
        }
        
        guard let searchText = clientSearchTextField.text, !searchText.isEmpty else {
            filteredClients = clients
            clientTableView.isHidden = filteredClients.isEmpty
            clientTableView.reloadData()
            return
        }
        
        filteredClients = clients.filter { client in
            client.name.localizedCaseInsensitiveContains(searchText) ||
            (client.email?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
        clientTableView.isHidden = filteredClients.isEmpty
        clientTableView.reloadData()
    }
    
    @objc private func clientSearchDidBegin() {
        filteredClients = clients
        clientTableView.isHidden = filteredClients.isEmpty
        clientTableView.reloadData()
    }
    
    @objc private func pickerDone() {
        view.endEditing(true)
    }
    
    @objc private func datePickerDone() {
        updateDateField()
        dateTextField.resignFirstResponder()
    }
    
    @objc private func dateChanged() {
        updateDateField()
    }
    
    @objc private func timePickerDone() {
        updateTimeField()
        timeTextField.resignFirstResponder()
    }
    
    @objc private func timeChanged() {
        updateTimeField()
    }
    
    @objc private func dismissKeyboard() {
        clientTableView.isHidden = true
        view.endEditing(true)
    }
    
    @objc private func hideClientTable() {
        clientTableView.isHidden = true
    }
    
    // MARK: - Helper Methods
    private func updateDateField() {
        dateTextField.text = dateFormatter.string(from: datePicker.date)
    }
    
    private func updateTimeField() {
        timeTextField.text = timeFormatter.string(from: timePicker.date)
    }
    
    private func validateFields() -> Bool {
        guard selectedClient != nil else {
            showAlert(title: "Error", message: "Please select a client")
            return false
        }
        
        guard selectedService != nil else {
            showAlert(title: "Error", message: "Please select a service")
            return false
        }
        
        return true
    }
    
    private func createAppointment(date: Date) {
        guard let client = selectedClient,
              let service = selectedService else {
            return
        }
        
        // Calculate payment info matching web app format
        let paymentAmount = selectedPaymentStatus == .paid ? (service.price ?? 0.0) : 0
        let remainingBalance = selectedPaymentStatus == .paid ? 0 : (service.price ?? 0.0)
        
        let payment = PaymentInfo(
            status: selectedPaymentStatus,
            amount: paymentAmount,
            method: selectedPaymentMethod.rawValue,
            transactionId: nil,
            paidAt: selectedPaymentStatus == .paid ? Date() : nil,
            depositRequired: service.depositRequired,
            depositPercentage: service.depositPercentage,
            depositPaid: false,
            remainingBalance: remainingBalance
        )
        
        let appointment = Appointment(
            id: UUID().uuidString,
            clientId: client.id,
            clientName: client.name,
            clientEmail: client.email,
            serviceName: service.name,
            serviceId: service.id,
            serviceCategory: service.category,
            staffId: selectedStaff?.id,
            staffName: selectedStaff?.name,
            locationId: selectedLocation?.id,
            locationName: selectedLocation?.name ?? "Main Location",
            date: date,
            duration: service.duration ?? 60,
            bufferTime: service.bufferTime ?? 0,
            price: service.price ?? 0.0,
            status: selectedStatus,
            payment: payment,
            notes: notesTextView.text.isEmpty || notesTextView.text == "Add any notes about this appointment..." ? nil : notesTextView.text,
            businessId: businessId,
            createdAt: Date()
        )
        
        // Save to Firestore
        let appointmentRef = db.collection("appointments").document(appointment.id)
        appointmentRef.setData(appointment.dictionary) { [weak self] error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.showAlert(title: "Error", message: "Failed to create appointment: \(error.localizedDescription)")
                } else {
                    // Appointment created successfully, now send confirmation email
                    self?.sendBookingConfirmationEmail(appointment: appointment, client: client, service: service)
                    
                    self?.showAlert(title: "Success", message: "Appointment created successfully") {
                        self?.dismiss(animated: true)
                    }
                }
            }
        }
    }
    
    private func sendBookingConfirmationEmail(appointment: Appointment, client: Client, service: Service) {
        // Check if client has an email address
        guard let clientEmail = client.email, !clientEmail.isEmpty else {
            print("AddAppointmentViewController: Client email not available, skipping email")
            return
        }
        
        // Fetch business data to get businessName and currency
        db.collection("businesses").document(businessId).getDocument { [weak self] businessDoc, error in
            guard let self = self else { return }
            
            if let error = error {
                print("AddAppointmentViewController: Error fetching business data: \(error.localizedDescription)")
                // Continue without sending email - appointment was created successfully
                return
            }
            
            guard let businessDoc = businessDoc, businessDoc.exists,
                  let businessData = businessDoc.data() else {
                print("AddAppointmentViewController: Business document not found")
                return
            }
            
            let businessName = businessData["businessName"] as? String ?? businessData["name"] as? String ?? "Business"
            let currency = businessData["currency"] as? String ?? "gbp"
            
            // Format date and time for email (ISO 8601 format to match web app)
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime]
            let appointmentDateISO = dateFormatter.string(from: appointment.date)
            
            // Format time as HH:mm
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"
            let appointmentTime = timeFormatter.string(from: appointment.date)
            
            // Prepare appointment data for email API
            let appointmentData: [String: Any] = [
                "customerName": client.name,
                "clientId": client.id,
                "clientEmail": clientEmail,
                "serviceName": service.name,
                "staffName": self.selectedStaff?.name ?? "Any Staff",
                "appointmentDate": appointmentDateISO,
                "appointmentTime": appointmentTime,
                "locationName": self.selectedLocation?.name ?? "Main Location",
                "businessName": businessName,
                "totalPrice": service.price ?? 0.0,
                "currency": currency,
                "notes": appointment.notes ?? "",
                "appointmentId": appointment.id,
                "businessId": self.businessId
            ]
            
            // Prepare email request
            let emailRequest: [String: Any] = [
                "to": clientEmail,
                "subject": "Appointment Confirmation - \(service.name)",
                "type": "booking_confirmation",
                "businessId": self.businessId,
                "appointmentData": appointmentData
            ]
            
            // Send email via API
            guard let url = URL(string: "\(ConfigurationManager.shared.apiBaseUrl)/email/send") else {
                print("AddAppointmentViewController: Invalid API URL")
                return
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: emailRequest)
            } catch {
                print("AddAppointmentViewController: Error creating request body: \(error.localizedDescription)")
                return
            }
            
            URLSession.shared.dataTask(with: request) { data, response, error in
                if let error = error {
                    print("AddAppointmentViewController: Error sending confirmation email: \(error.localizedDescription)")
                    // Don't show error to user - appointment was created successfully
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        print("AddAppointmentViewController: ✅ Confirmation email sent successfully")
                    } else {
                        print("AddAppointmentViewController: ⚠️ Failed to send confirmation email (Status: \(httpResponse.statusCode))")
                        if let data = data,
                           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                           let errorMessage = json["error"] as? String {
                            print("AddAppointmentViewController: Error message: \(errorMessage)")
                        }
                    }
                }
            }.resume()
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

// MARK: - Models
struct Service {
    let id: String
    let name: String
    let category: String?
    let price: Double?
    let duration: Int?
    let bufferTime: Int?
    let depositRequired: Bool?
    let depositPercentage: Int?
    
    init?(from data: [String: Any], id: String) {
        self.id = id
        self.name = data["name"] as? String ?? ""
        self.category = data["category"] as? String
        self.price = data["price"] as? Double
        self.duration = data["duration"] as? Int
        self.bufferTime = data["bufferTime"] as? Int
        self.depositRequired = data["depositRequired"] as? Bool
        self.depositPercentage = data["depositPercentage"] as? Int
    }
}

enum PickerItem {
    case category(String)
    case service(Service)
}

struct Location {
    let id: String
    let name: String
    
    init?(from data: [String: Any], id: String) {
        self.id = id
        self.name = data["name"] as? String ?? ""
    }
}

struct Staff {
    let id: String
    let name: String
    
    init?(from data: [String: Any], id: String) {
        self.id = id
        self.name = data["name"] as? String ?? ""
    }
}

// MARK: - UIPickerViewDataSource & UIPickerViewDelegate
extension AddAppointmentViewController: UIPickerViewDataSource, UIPickerViewDelegate {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        if pickerView == servicePicker {
            return flatServiceList.count
        } else if pickerView == locationPicker {
            return locations.count
        } else if pickerView == staffPicker {
            return staff.count + 1 // +1 for "Any Staff"
        } else if pickerView == statusPicker {
            return AppointmentStatus.allCases.count
        } else if pickerView == paymentStatusPicker {
            return PaymentStatus.allCases.count
        } else if pickerView == paymentMethodPicker {
            return PaymentMethod.allCases.count
        }
        return 0
    }
    
    func pickerView(_ pickerView: UIPickerView, attributedTitleForRow row: Int, forComponent component: Int) -> NSAttributedString? {
        if pickerView == servicePicker {
            let item = flatServiceList[row]
            switch item {
            case .category(let categoryName):
                // Style category headers differently - bold and colored
                let attributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.boldSystemFont(ofSize: 16),
                    .foregroundColor: ThemeManager.Colors.primary
                ]
                return NSAttributedString(string: "━━━ \(categoryName) ━━━", attributes: attributes)
            case .service(let service):
                // Regular style for services
                let attributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 17),
                    .foregroundColor: ThemeManager.Colors.label
                ]
                return NSAttributedString(string: "  \(service.name)", attributes: attributes)
            }
        }
        return nil
    }
    
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        // Service picker uses attributedTitleForRow, so we only handle other pickers here
        if pickerView == locationPicker {
            return locations[row].name
        } else if pickerView == staffPicker {
            return row == 0 ? "Any Staff" : staff[row - 1].name
        } else if pickerView == statusPicker {
            return AppointmentStatus.allCases[row].rawValue.capitalized
        } else if pickerView == paymentStatusPicker {
            return PaymentStatus.allCases[row].rawValue.capitalized
        } else if pickerView == paymentMethodPicker {
            let method = PaymentMethod.allCases[row]
            switch method {
            case .cash: return "Cash"
            case .bankTransfer: return "Bank Transfer"
            case .cardPayment: return "Card Payment"
            case .voucher: return "Voucher"
            }
        }
        return nil
    }
    
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        if pickerView == servicePicker {
            let item = flatServiceList[row]
            switch item {
            case .category:
                // Don't allow selecting category headers - find and select the first service in this category
                var nextRow = row + 1
                while nextRow < flatServiceList.count {
                    if case .service(let service) = flatServiceList[nextRow] {
                        selectedService = service
                        serviceTextField.text = service.name
                        pickerView.selectRow(nextRow, inComponent: component, animated: true)
                        break
                    } else if case .category = flatServiceList[nextRow] {
                        // Hit another category, go back to previous service
                        break
                    }
                    nextRow += 1
                }
            case .service(let service):
                selectedService = service
                serviceTextField.text = service.name
            }
        } else if pickerView == locationPicker {
            selectedLocation = locations[row]
            locationTextField.text = locations[row].name
        } else if pickerView == staffPicker {
            if row == 0 {
                selectedStaff = nil
                staffTextField.text = "Any Staff"
            } else {
                selectedStaff = staff[row - 1]
                staffTextField.text = staff[row - 1].name
            }
        } else if pickerView == statusPicker {
            selectedStatus = AppointmentStatus.allCases[row]
            statusTextField.text = AppointmentStatus.allCases[row].rawValue.capitalized
        } else if pickerView == paymentStatusPicker {
            selectedPaymentStatus = PaymentStatus.allCases[row]
            paymentStatusTextField.text = PaymentStatus.allCases[row].rawValue.capitalized
        } else if pickerView == paymentMethodPicker {
            selectedPaymentMethod = PaymentMethod.allCases[row]
            let method = PaymentMethod.allCases[row]
            switch method {
            case .cash: paymentMethodTextField.text = "Cash"
            case .bankTransfer: paymentMethodTextField.text = "Bank Transfer"
            case .cardPayment: paymentMethodTextField.text = "Card Payment"
            case .voucher: paymentMethodTextField.text = "Voucher"
            }
        }
    }
}

// MARK: - UITableViewDataSource & UITableViewDelegate
extension AddAppointmentViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredClients.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ClientCell", for: indexPath)
        let client = filteredClients[indexPath.row]
        cell.textLabel?.text = client.name
        cell.detailTextLabel?.text = client.email
        cell.detailTextLabel?.textColor = ThemeManager.Colors.secondaryLabel
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let selectedClientFromTable = filteredClients[indexPath.row]
        let clientName = selectedClientFromTable.name
        selectedClient = selectedClientFromTable
        
        // Hide table immediately
        clientTableView.isHidden = true
        
        // Remove target actions to prevent any interference
        clientSearchTextField.removeTarget(nil, action: nil, for: .allEvents)
        
        // Store the client name to ensure we can restore it if needed
        let savedClientName = clientName
        
        // Set text multiple times to ensure it sticks
        clientSearchTextField.text = savedClientName
        
        // Dismiss keyboard without using view.endEditing which might clear other fields
        if clientSearchTextField.isFirstResponder {
            clientSearchTextField.resignFirstResponder()
        }
        
        // Re-set text after a very short delay to override any clearing
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.clientSearchTextField.text = savedClientName
            
            // Set again after resignFirstResponder completes
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.clientSearchTextField.text = savedClientName
                
                // Re-add target actions
                self.clientSearchTextField.addTarget(self, action: #selector(self.clientSearchChanged), for: .editingChanged)
                self.clientSearchTextField.addTarget(self, action: #selector(self.clientSearchDidBegin), for: .editingDidBegin)
            }
        }
    }
}

// MARK: - UIGestureRecognizerDelegate
extension AddAppointmentViewController: UIGestureRecognizerDelegate {
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        // Don't interfere with touches on interactive elements
        var currentView: UIView? = touch.view
        
        // Walk up the view hierarchy to check if touch is on table view or its subviews
        while let view = currentView {
            if view is UITableView || view is UITableViewCell {
                return false
            }
            if view is UIButton || view is UITextField || view is UITextView {
                return false
            }
            currentView = view.superview
        }
        
        return true
    }
    
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        // Allow table view's pan gesture to work simultaneously
        return true
    }
}

// MARK: - UITextViewDelegate
extension AddAppointmentViewController: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        if textView.text == "Add any notes about this appointment..." {
            textView.text = ""
            textView.textColor = ThemeManager.Colors.label
        }
    }
    
    func textViewDidEndEditing(_ textView: UITextView) {
        if textView.text.isEmpty {
            textView.text = "Add any notes about this appointment..."
            textView.textColor = ThemeManager.Colors.secondaryLabel
        }
    }
}
