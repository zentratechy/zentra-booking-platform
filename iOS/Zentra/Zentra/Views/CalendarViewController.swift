//
//  CalendarViewController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit
import Combine
import FirebaseFirestore

class CalendarViewController: UIViewController {
    
    // MARK: - Properties
    private let businessId: String
    private let appointmentManager: AppointmentManager
    private let db = Firestore.firestore()
    
    // Filter data
    private var staffMembers: [Staff] = []
    private var serviceCategories: [String] = []
    private var selectedStaffIds: Set<String> = []
    private var selectedCategories: Set<String> = []
    
    // MARK: - Initialization
    init(businessId: String) {
        self.businessId = businessId
        self.appointmentManager = AppointmentManager()
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - UI Elements
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Calendar"
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
        let attributedString = NSMutableAttributedString(string: "Calendar")
        attributedString.addAttribute(.kern, value: 2.0, range: NSRange(location: 0, length: attributedString.length))
        label.attributedText = attributedString
        
        return label
    }()
    
    private let calendarCard: UIView = {
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
    
    private let calendarView: UICollectionView = {
        let layout = UICollectionViewFlowLayout()
        layout.minimumInteritemSpacing = 0
        layout.minimumLineSpacing = 0
        let collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = UIColor.clear
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        return collectionView
    }()
    
    private let monthLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 24, weight: .light)
        label.textColor = UIColor(red: 0.25, green: 0.25, blue: 0.3, alpha: 1.0)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        
        // Apply letter spacing
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMMM yyyy"
        let monthText = dateFormatter.string(from: Date())
        let attributedString = NSMutableAttributedString(string: monthText)
        attributedString.addAttribute(.kern, value: 1.5, range: NSRange(location: 0, length: attributedString.length))
        label.attributedText = attributedString
        
        return label
    }()
    
    private let previousMonthButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("‹", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        button.setTitleColor(ThemeManager.Colors.primary, for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private let nextMonthButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("›", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        button.setTitleColor(ThemeManager.Colors.primary, for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private let appointmentsCard: UIView = {
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
    
    private let appointmentsTableView: UITableView = {
        let tableView = UITableView()
        tableView.register(AppointmentTableViewCell.self, forCellReuseIdentifier: AppointmentTableViewCell.identifier)
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
        label.text = "No appointments today"
        label.applySecondaryTitleStyle()
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // Filter UI
    private let filterContainer: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.white
        view.layer.cornerRadius = 20
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOffset = CGSize(width: 0, height: 4)
        view.layer.shadowRadius = 12
        view.layer.shadowOpacity = 0.1
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let staffFilterButton: UIButton = {
        let button = UIButton(type: .system)
        button.backgroundColor = UIColor(red: 0.95, green: 0.95, blue: 0.97, alpha: 1.0)
        button.layer.cornerRadius = 12
        button.setTitle("All Staff", for: .normal)
        button.setTitleColor(UIColor(red: 0.25, green: 0.25, blue: 0.3, alpha: 1.0), for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        button.contentHorizontalAlignment = .left
        button.titleEdgeInsets = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 40)
        button.translatesAutoresizingMaskIntoConstraints = false
        
        // Add chevron icon
        let chevron = UIImageView(image: UIImage(systemName: "chevron.down"))
        chevron.tintColor = UIColor(red: 0.5, green: 0.5, blue: 0.55, alpha: 1.0)
        chevron.translatesAutoresizingMaskIntoConstraints = false
        button.addSubview(chevron)
        NSLayoutConstraint.activate([
            chevron.trailingAnchor.constraint(equalTo: button.trailingAnchor, constant: -16),
            chevron.centerYAnchor.constraint(equalTo: button.centerYAnchor)
        ])
        
        return button
    }()
    
    private let categoryFilterButton: UIButton = {
        let button = UIButton(type: .system)
        button.backgroundColor = UIColor(red: 0.95, green: 0.95, blue: 0.97, alpha: 1.0)
        button.layer.cornerRadius = 12
        button.setTitle("All Categories", for: .normal)
        button.setTitleColor(UIColor(red: 0.25, green: 0.25, blue: 0.3, alpha: 1.0), for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        button.contentHorizontalAlignment = .left
        button.titleEdgeInsets = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 40)
        button.translatesAutoresizingMaskIntoConstraints = false
        
        // Add chevron icon
        let chevron = UIImageView(image: UIImage(systemName: "chevron.down"))
        chevron.tintColor = UIColor(red: 0.5, green: 0.5, blue: 0.55, alpha: 1.0)
        chevron.translatesAutoresizingMaskIntoConstraints = false
        button.addSubview(chevron)
        NSLayoutConstraint.activate([
            chevron.trailingAnchor.constraint(equalTo: button.trailingAnchor, constant: -16),
            chevron.centerYAnchor.constraint(equalTo: button.centerYAnchor)
        ])
        
        return button
    }()
    
    // MARK: - Properties
    private var currentDate = Date()
    private var selectedDate = Date()
    private var appointmentsForSelectedDate: [Appointment] = []
    private var allAppointments: [Appointment] = []
    private var cancellables = Set<AnyCancellable>()
    
    private let calendar = Calendar.current
    private let dateFormatter = DateFormatter()
    
    // Staff model
    struct Staff {
        let id: String
        let name: String
        
        init?(from data: [String: Any], id: String) {
            self.id = id
            self.name = data["name"] as? String ?? ""
        }
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupLuxuryGradientBackground()
        setupUI()
        setupConstraints()
        setupActions()
        setupCalendar()
        setupTableView()
        updateMonthLabel()
        fetchStaff()
        fetchServiceCategories()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        appointmentManager.startListening(businessId: businessId)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        appointmentManager.stopListening()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientBackground()
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
        view.addSubview(calendarCard)
        calendarCard.addSubview(monthLabel)
        calendarCard.addSubview(previousMonthButton)
        calendarCard.addSubview(nextMonthButton)
        calendarCard.addSubview(calendarView)
        view.addSubview(filterContainer)
        filterContainer.addSubview(staffFilterButton)
        filterContainer.addSubview(categoryFilterButton)
        view.addSubview(appointmentsCard)
        appointmentsCard.addSubview(appointmentsTableView)
        appointmentsCard.addSubview(emptyStateView)
        
        emptyStateView.addSubview(emptyStateLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Title Label
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            
            // Calendar Card
            calendarCard.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 24),
            calendarCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            calendarCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            calendarCard.heightAnchor.constraint(equalToConstant: 380),
            
            // Month Label
            monthLabel.topAnchor.constraint(equalTo: calendarCard.topAnchor, constant: 20),
            monthLabel.centerXAnchor.constraint(equalTo: calendarCard.centerXAnchor),
            
            // Previous Month Button
            previousMonthButton.centerYAnchor.constraint(equalTo: monthLabel.centerYAnchor),
            previousMonthButton.leadingAnchor.constraint(equalTo: calendarCard.leadingAnchor, constant: 20),
            
            // Next Month Button
            nextMonthButton.centerYAnchor.constraint(equalTo: monthLabel.centerYAnchor),
            nextMonthButton.trailingAnchor.constraint(equalTo: calendarCard.trailingAnchor, constant: -20),
            
            // Calendar View
            calendarView.topAnchor.constraint(equalTo: monthLabel.bottomAnchor, constant: 16),
            calendarView.leadingAnchor.constraint(equalTo: calendarCard.leadingAnchor, constant: 16),
            calendarView.trailingAnchor.constraint(equalTo: calendarCard.trailingAnchor, constant: -16),
            calendarView.bottomAnchor.constraint(equalTo: calendarCard.bottomAnchor, constant: -16),
            
            // Filter Container
            filterContainer.topAnchor.constraint(equalTo: calendarCard.bottomAnchor, constant: 16),
            filterContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            filterContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            filterContainer.heightAnchor.constraint(equalToConstant: 60),
            
            // Staff Filter Button
            staffFilterButton.topAnchor.constraint(equalTo: filterContainer.topAnchor, constant: 8),
            staffFilterButton.leadingAnchor.constraint(equalTo: filterContainer.leadingAnchor, constant: 12),
            staffFilterButton.trailingAnchor.constraint(equalTo: filterContainer.centerXAnchor, constant: -6),
            staffFilterButton.bottomAnchor.constraint(equalTo: filterContainer.bottomAnchor, constant: -8),
            
            // Category Filter Button
            categoryFilterButton.topAnchor.constraint(equalTo: filterContainer.topAnchor, constant: 8),
            categoryFilterButton.leadingAnchor.constraint(equalTo: filterContainer.centerXAnchor, constant: 6),
            categoryFilterButton.trailingAnchor.constraint(equalTo: filterContainer.trailingAnchor, constant: -12),
            categoryFilterButton.bottomAnchor.constraint(equalTo: filterContainer.bottomAnchor, constant: -8),
            
            // Appointments Card
            appointmentsCard.topAnchor.constraint(equalTo: filterContainer.bottomAnchor, constant: 16),
            appointmentsCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            appointmentsCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            appointmentsCard.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            
            // Appointments Table View
            appointmentsTableView.topAnchor.constraint(equalTo: appointmentsCard.topAnchor, constant: 20),
            appointmentsTableView.leadingAnchor.constraint(equalTo: appointmentsCard.leadingAnchor),
            appointmentsTableView.trailingAnchor.constraint(equalTo: appointmentsCard.trailingAnchor),
            appointmentsTableView.bottomAnchor.constraint(equalTo: appointmentsCard.bottomAnchor, constant: -20),
            
            // Empty State
            emptyStateView.centerXAnchor.constraint(equalTo: appointmentsCard.centerXAnchor),
            emptyStateView.centerYAnchor.constraint(equalTo: appointmentsCard.centerYAnchor),
            emptyStateView.leadingAnchor.constraint(equalTo: appointmentsCard.leadingAnchor, constant: 40),
            emptyStateView.trailingAnchor.constraint(equalTo: appointmentsCard.trailingAnchor, constant: -40),
            
            emptyStateLabel.topAnchor.constraint(equalTo: emptyStateView.topAnchor),
            emptyStateLabel.leadingAnchor.constraint(equalTo: emptyStateView.leadingAnchor),
            emptyStateLabel.trailingAnchor.constraint(equalTo: emptyStateView.trailingAnchor),
            emptyStateLabel.bottomAnchor.constraint(equalTo: emptyStateView.bottomAnchor)
        ])
    }
    
    private func setupActions() {
        previousMonthButton.addTarget(self, action: #selector(previousMonthTapped), for: .touchUpInside)
        nextMonthButton.addTarget(self, action: #selector(nextMonthTapped), for: .touchUpInside)
        staffFilterButton.addTarget(self, action: #selector(staffFilterTapped), for: .touchUpInside)
        categoryFilterButton.addTarget(self, action: #selector(categoryFilterTapped), for: .touchUpInside)
        
        // Add + button to navigation bar
        let addButton = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(addAppointmentTapped))
        navigationItem.rightBarButtonItem = addButton
    }
    
    @objc private func addAppointmentTapped() {
        let addAppointmentVC = AddAppointmentViewController(businessId: businessId, defaultDate: selectedDate)
        let navController = UINavigationController(rootViewController: addAppointmentVC)
        present(navController, animated: true)
    }
    
    private func setupCalendar() {
        calendarView.delegate = self
        calendarView.dataSource = self
        calendarView.register(CalendarDayCell.self, forCellWithReuseIdentifier: CalendarDayCell.identifier)
        calendarView.allowsMultipleSelection = false
    }
    
    private func setupTableView() {
        appointmentsTableView.delegate = self
        appointmentsTableView.dataSource = self
        appointmentsTableView.separatorStyle = .singleLine
        appointmentsTableView.rowHeight = 80
        
        // Observe appointment manager changes
        appointmentManager.$appointments
            .receive(on: DispatchQueue.main)
            .sink { [weak self] appointments in
                print("CalendarViewController: Received \(appointments.count) appointments")
                self?.allAppointments = appointments
                self?.updateAppointmentsForSelectedDate()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Data Fetching
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
                    self?.staffMembers = documents.compactMap { doc in
                        Staff(from: doc.data(), id: doc.documentID)
                    }
                    
                    // Select all staff by default
                    self?.selectedStaffIds = Set(self?.staffMembers.map { $0.id } ?? [])
                    self?.updateStaffFilterButton()
                    
                    print("Fetched \(self?.staffMembers.count ?? 0) staff members")
                }
            }
    }
    
    private func fetchServiceCategories() {
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
                    var categories: Set<String> = []
                    
                    for doc in documents {
                        if let category = doc.data()["category"] as? String, !category.isEmpty {
                            categories.insert(category)
                        }
                    }
                    
                    self?.serviceCategories = Array(categories).sorted()
                    
                    // Select all categories by default
                    self?.selectedCategories = Set(self?.serviceCategories)
                    self?.updateCategoryFilterButton()
                    
                    print("Fetched \(self?.serviceCategories.count ?? 0) service categories")
                }
            }
    }
    
    // MARK: - Actions
    @objc private func previousMonthTapped() {
        currentDate = calendar.date(byAdding: .month, value: -1, to: currentDate) ?? currentDate
        updateMonthLabel()
        calendarView.reloadData()
    }
    
    @objc private func nextMonthTapped() {
        currentDate = calendar.date(byAdding: .month, value: 1, to: currentDate) ?? currentDate
        updateMonthLabel()
        calendarView.reloadData()
    }
    
    // MARK: - Helper Methods
    private func updateMonthLabel() {
        dateFormatter.dateFormat = "MMMM yyyy"
        let monthText = dateFormatter.string(from: currentDate)
        let attributedString = NSMutableAttributedString(string: monthText)
        attributedString.addAttribute(.kern, value: 1.5, range: NSRange(location: 0, length: attributedString.length))
        monthLabel.attributedText = attributedString
    }
    
    private func updateAppointmentsForSelectedDate() {
        let dateAppointments = appointmentManager.getAppointmentsForDate(selectedDate)
        
        // Apply filters
        var filtered = dateAppointments
        
        // Filter by staff
        if !selectedStaffIds.isEmpty && selectedStaffIds.count < staffMembers.count {
            filtered = filtered.filter { appointment in
                guard let staffId = appointment.staffId else { return false }
                return selectedStaffIds.contains(staffId)
            }
        }
        
        // Filter by service category
        if !selectedCategories.isEmpty && selectedCategories.count < serviceCategories.count {
            filtered = filtered.filter { appointment in
                guard let category = appointment.serviceCategory else { return false }
                return selectedCategories.contains(category)
            }
        }
        
        // Sort appointments by time (ascending - earliest first)
        appointmentsForSelectedDate = filtered.sorted { $0.date < $1.date }
        print("CalendarViewController: Found \(appointmentsForSelectedDate.count) appointments for selected date (filtered from \(dateAppointments.count))")
        emptyStateView.isHidden = !appointmentsForSelectedDate.isEmpty
        appointmentsTableView.reloadData()
        calendarView.reloadData() // Reload calendar to show appointment dots
    }
    
    private func updateStaffFilterButton() {
        if selectedStaffIds.isEmpty || selectedStaffIds.count == staffMembers.count {
            staffFilterButton.setTitle("All Staff", for: .normal)
        } else {
            staffFilterButton.setTitle("\(selectedStaffIds.count) Staff", for: .normal)
        }
    }
    
    private func updateCategoryFilterButton() {
        if selectedCategories.isEmpty || selectedCategories.count == serviceCategories.count {
            categoryFilterButton.setTitle("All Categories", for: .normal)
        } else {
            categoryFilterButton.setTitle("\(selectedCategories.count) Categories", for: .normal)
        }
    }
    
    @objc private func staffFilterTapped() {
        showMultiSelectModal(
            title: "Select Staff",
            items: staffMembers.map { ($0.id, $0.name) },
            selectedIds: selectedStaffIds,
            completion: { [weak self] selectedIds in
                self?.selectedStaffIds = selectedIds
                self?.updateStaffFilterButton()
                self?.updateAppointmentsForSelectedDate()
            }
        )
    }
    
    @objc private func categoryFilterTapped() {
        showMultiSelectModal(
            title: "Select Categories",
            items: serviceCategories.map { ($0, $0) },
            selectedIds: selectedCategories,
            completion: { [weak self] selectedIds in
                self?.selectedCategories = selectedIds
                self?.updateCategoryFilterButton()
                self?.updateAppointmentsForSelectedDate()
            }
        )
    }
    
    private func showMultiSelectModal(
        title: String,
        items: [(id: String, name: String)],
        selectedIds: Set<String>,
        completion: @escaping (Set<String>) -> Void
    ) {
        let modalVC = MultiSelectModalViewController(
            title: title,
            items: items,
            selectedIds: selectedIds
        )
        modalVC.onSelectionChanged = completion
        
        let navController = UINavigationController(rootViewController: modalVC)
        navController.modalPresentationStyle = .pageSheet
        
        if let sheet = navController.sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
        }
        
        present(navController, animated: true)
    }
    
    private func getDaysInMonth() -> [Date] {
        guard let range = calendar.range(of: .day, in: .month, for: currentDate) else { return [] }
        
        let firstDayOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: currentDate))!
        let firstWeekday = calendar.component(.weekday, from: firstDayOfMonth)
        
        var days: [Date] = []
        
        // Add empty cells for days before the first day of the month
        for _ in 1..<firstWeekday {
            days.append(Date.distantPast)
        }
        
        // Add days of the month
        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDayOfMonth) {
                days.append(date)
            }
        }
        
        return days
    }
    
    private func hasAppointmentsOnDate(_ date: Date) -> Bool {
        let dateAppointments = appointmentManager.getAppointmentsForDate(date)
        
        // Apply filters
        var filtered = dateAppointments
        
        // Filter by staff
        if !selectedStaffIds.isEmpty && selectedStaffIds.count < staffMembers.count {
            filtered = filtered.filter { appointment in
                guard let staffId = appointment.staffId else { return false }
                return selectedStaffIds.contains(staffId)
            }
        }
        
        // Filter by service category
        if !selectedCategories.isEmpty && selectedCategories.count < serviceCategories.count {
            filtered = filtered.filter { appointment in
                guard let category = appointment.serviceCategory else { return false }
                return selectedCategories.contains(category)
            }
        }
        
        return !filtered.isEmpty
    }
}

// MARK: - UICollectionViewDataSource
extension CalendarViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return 7 + getDaysInMonth().count // 7 for weekday headers
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: CalendarDayCell.identifier, for: indexPath) as! CalendarDayCell
        
        if indexPath.item < 7 {
            // Weekday headers
            let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            cell.configureAsHeader(with: weekdays[indexPath.item])
        } else {
            // Calendar days
            let days = getDaysInMonth()
            let dayIndex = indexPath.item - 7
            if dayIndex < days.count {
                let date = days[dayIndex]
                let hasAppointments = hasAppointmentsOnDate(date)
                let isSelected = calendar.isDate(date, inSameDayAs: selectedDate)
                cell.configure(with: date, hasAppointments: hasAppointments, isSelected: isSelected)
            } else {
                cell.configureEmpty()
            }
        }
        
        return cell
    }
}

// MARK: - UICollectionViewDelegate
extension CalendarViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        if indexPath.item >= 7 {
            let days = getDaysInMonth()
            let dayIndex = indexPath.item - 7
            if dayIndex < days.count {
                let date = days[dayIndex]
                if date != Date.distantPast {
                    selectedDate = date
                    updateAppointmentsForSelectedDate()
                    collectionView.reloadData()
                }
            }
        }
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension CalendarViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        let width = collectionView.frame.width / 7
        return CGSize(width: width, height: 40)
    }
}

// MARK: - UITableViewDataSource
extension CalendarViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return appointmentsForSelectedDate.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: AppointmentTableViewCell.identifier, for: indexPath) as! AppointmentTableViewCell
        cell.configure(with: appointmentsForSelectedDate[indexPath.row])
        return cell
    }
}

// MARK: - UITableViewDelegate
extension CalendarViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let appointment = appointmentsForSelectedDate[indexPath.row]
        
        let appointmentDetailVC = AppointmentDetailViewController(appointment: appointment)
        navigationController?.pushViewController(appointmentDetailVC, animated: true)
    }
}
