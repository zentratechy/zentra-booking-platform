//
//  PaymentsViewController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit
import Combine

class PaymentsViewController: UIViewController {
    
    // MARK: - Properties
    private let businessId: String
    
    // MARK: - Initialization
    init(businessId: String) {
        self.businessId = businessId
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - UI Elements
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Payments"
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
        let attributedString = NSMutableAttributedString(string: "Payments")
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
    
    private let segmentedControl: UISegmentedControl = {
        let items = ["All", "Paid", "Pending", "Refunded"]
        let control = UISegmentedControl(items: items)
        control.selectedSegmentIndex = 0
        control.selectedSegmentTintColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        control.translatesAutoresizingMaskIntoConstraints = false
        return control
    }()
    
    private let tableView: UITableView = {
        let tableView = UITableView()
        tableView.register(PaymentTableViewCell.self, forCellReuseIdentifier: PaymentTableViewCell.identifier)
        tableView.backgroundColor = UIColor.clear
        tableView.separatorColor = UIColor(red: 0.95, green: 0.95, blue: 0.95, alpha: 1.0)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        return tableView
    }()
    
    private let emptyStateView: UIView = {
        let view = UIView()
        view.isHidden = true
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let emptyStateLabel: UILabel = {
        let label = UILabel()
        label.text = "No payments yet"
        label.applySecondaryTitleStyle()
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let emptyStateSubtitle: UILabel = {
        let label = UILabel()
        label.text = "Payments will appear here once customers book appointments"
        label.applyCaptionStyle()
        label.textAlignment = .center
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // MARK: - Properties
    private let appointmentManager = AppointmentManager()
    private var filteredAppointments: [Appointment] = []
    private var currentFilter: PaymentStatus? = nil
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupLuxuryGradientBackground()
        setupUI()
        setupConstraints()
        setupActions()
        setupTableView()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientBackground()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        if let businessId = AuthManager.shared.currentUser?.businessId {
            appointmentManager.startListening(businessId: businessId)
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        appointmentManager.stopListening()
    }
    
    // MARK: - Setup
    private func setupUI() {
        setupLuxuryGradientBackground()
        
        // Style the navigation bar
        navigationController?.navigationBar.tintColor = ThemeManager.Colors.primary
        navigationController?.navigationBar.barTintColor = UIColor.clear
        navigationController?.navigationBar.setBackgroundImage(UIImage(), for: .default)
        navigationController?.navigationBar.shadowImage = UIImage()
        navigationController?.navigationBar.isTranslucent = true
        
        view.addSubview(titleLabel)
        view.addSubview(contentCard)
        contentCard.addSubview(segmentedControl)
        contentCard.addSubview(tableView)
        contentCard.addSubview(emptyStateView)
        
        emptyStateView.addSubview(emptyStateLabel)
        emptyStateView.addSubview(emptyStateSubtitle)
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
            
            // Segmented Control
            segmentedControl.topAnchor.constraint(equalTo: contentCard.topAnchor, constant: 20),
            segmentedControl.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor, constant: 16),
            segmentedControl.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor, constant: -16),
            
            // Table View
            tableView.topAnchor.constraint(equalTo: segmentedControl.bottomAnchor, constant: 16),
            tableView.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: contentCard.bottomAnchor),
            
            // Empty State
            emptyStateView.centerXAnchor.constraint(equalTo: contentCard.centerXAnchor),
            emptyStateView.centerYAnchor.constraint(equalTo: contentCard.centerYAnchor),
            emptyStateView.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor, constant: 40),
            emptyStateView.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor, constant: -40),
            
            emptyStateLabel.topAnchor.constraint(equalTo: emptyStateView.topAnchor),
            emptyStateLabel.leadingAnchor.constraint(equalTo: emptyStateView.leadingAnchor),
            emptyStateLabel.trailingAnchor.constraint(equalTo: emptyStateView.trailingAnchor),
            
            emptyStateSubtitle.topAnchor.constraint(equalTo: emptyStateLabel.bottomAnchor, constant: 8),
            emptyStateSubtitle.leadingAnchor.constraint(equalTo: emptyStateView.leadingAnchor),
            emptyStateSubtitle.trailingAnchor.constraint(equalTo: emptyStateView.trailingAnchor),
            emptyStateSubtitle.bottomAnchor.constraint(equalTo: emptyStateView.bottomAnchor)
        ])
    }
    
    private func setupActions() {
        segmentedControl.addTarget(self, action: #selector(segmentedControlChanged), for: .valueChanged)
    }
    
    private func setupTableView() {
        tableView.delegate = self
        tableView.dataSource = self
        tableView.separatorStyle = .singleLine
        tableView.rowHeight = 100
        
        // Observe appointment manager changes
        appointmentManager.$appointments
            .receive(on: DispatchQueue.main)
            .sink { [weak self] appointments in
                self?.updateUI()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Actions
    @objc private func segmentedControlChanged() {
        switch segmentedControl.selectedSegmentIndex {
        case 0:
            currentFilter = nil
        case 1:
            currentFilter = .paid
        case 2:
            currentFilter = .pending
        case 3:
            currentFilter = .refunded
        default:
            currentFilter = nil
        }
        updateUI()
    }
    
    // MARK: - Helper Methods
    private func updateUI() {
        // Show all appointments, handle payment info in the cell
        filteredAppointments = appointmentManager.appointments.filter { appointment in
            // If no filter is selected, show all appointments
            if currentFilter == nil {
                return true
            }
            // If filter is selected, only show appointments with matching payment status
            guard let payment = appointment.payment else { return false }
            return payment.status == currentFilter
        }
        
        emptyStateView.isHidden = !filteredAppointments.isEmpty
        tableView.reloadData()
    }
}

// MARK: - UITableViewDataSource
extension PaymentsViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredAppointments.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: PaymentTableViewCell.identifier, for: indexPath) as! PaymentTableViewCell
        cell.configure(with: filteredAppointments[indexPath.row])
        return cell
    }
}

// MARK: - UITableViewDelegate
extension PaymentsViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let appointment = filteredAppointments[indexPath.row]
        
        let paymentDetailVC = PaymentDetailViewController(appointment: appointment)
        navigationController?.pushViewController(paymentDetailVC, animated: true)
    }
}
