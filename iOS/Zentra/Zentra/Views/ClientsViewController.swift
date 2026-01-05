//
//  ClientsViewController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit
import Combine

class ClientsViewController: UIViewController {
    
    // MARK: - UI Elements
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Customers"
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
        let attributedString = NSMutableAttributedString(string: "Customers")
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
    
    private let searchBar: UISearchBar = {
        let searchBar = UISearchBar()
        searchBar.placeholder = "Search customers..."
        searchBar.searchBarStyle = .minimal
        searchBar.backgroundColor = UIColor.clear
        searchBar.searchTextField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        searchBar.searchTextField.layer.cornerRadius = 16
        searchBar.searchTextField.layer.borderWidth = 0
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        return searchBar
    }()
    
    private let tableView: UITableView = {
        let tableView = UITableView()
        tableView.register(ClientTableViewCell.self, forCellReuseIdentifier: ClientTableViewCell.identifier)
        tableView.backgroundColor = UIColor.clear
        tableView.separatorColor = UIColor(red: 0.95, green: 0.95, blue: 0.95, alpha: 1.0)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        return tableView
    }()
    
    private let addButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("+ Add Customer", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 1.0)
        button.layer.cornerRadius = 20
        button.layer.shadowColor = UIColor(red: 0.85, green: 0.65, blue: 0.75, alpha: 0.5).cgColor
        button.layer.shadowOffset = CGSize(width: 0, height: 8)
        button.layer.shadowRadius = 16
        button.layer.shadowOpacity = 0.4
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private let emptyStateView: UIView = {
        let view = UIView()
        view.isHidden = true
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let emptyStateLabel: UILabel = {
        let label = UILabel()
        label.text = "No customers yet"
        label.applySecondaryTitleStyle()
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let emptyStateSubtitle: UILabel = {
        let label = UILabel()
        label.text = "Add your first customer to get started"
        label.applyCaptionStyle()
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // MARK: - Properties
    private let clientManager: ClientManager
    private let businessId: String
    private var filteredClients: [Client] = []
    private var isSearching = false
    
    // MARK: - Initialization
    init(businessId: String) {
        self.businessId = businessId
        self.clientManager = ClientManager(businessId: businessId)
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupConstraints()
        setupActions()
        setupTableView()
        setupSearchBar()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // ClientManager automatically starts listening in init
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        clientManager.stopListening()
    }
    
    // MARK: - Setup
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientBackground()
    }
    
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
        contentCard.addSubview(searchBar)
        contentCard.addSubview(tableView)
        view.addSubview(addButton)
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
            contentCard.bottomAnchor.constraint(equalTo: addButton.topAnchor, constant: -20),
            
            // Search Bar
            searchBar.topAnchor.constraint(equalTo: contentCard.topAnchor, constant: 20),
            searchBar.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor, constant: 16),
            searchBar.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor, constant: -16),
            
            // Table View
            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 12),
            tableView.leadingAnchor.constraint(equalTo: contentCard.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: contentCard.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: contentCard.bottomAnchor),
            
            // Add Button
            addButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            addButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            addButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            addButton.heightAnchor.constraint(equalToConstant: 56),
            
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
        addButton.addTarget(self, action: #selector(addButtonTapped), for: .touchUpInside)
    }
    
    private func setupTableView() {
        tableView.delegate = self
        tableView.dataSource = self
        tableView.separatorStyle = .singleLine
        tableView.rowHeight = 80
        
        // Observe client manager changes
        clientManager.$clients
            .receive(on: DispatchQueue.main)
            .sink { [weak self] clients in
                print("ClientsViewController: Received \(clients.count) clients")
                self?.updateUI()
            }
            .store(in: &cancellables)
        
        // Also observe loading state
        clientManager.$isLoading
            .receive(on: DispatchQueue.main)
            .sink { isLoading in
                print("ClientsViewController: Loading state changed to: \(isLoading)")
            }
            .store(in: &cancellables)
        
        // Observe error messages
        clientManager.$errorMessage
            .receive(on: DispatchQueue.main)
            .sink { errorMessage in
                if let error = errorMessage {
                    print("ClientsViewController: Error: \(error)")
                }
            }
            .store(in: &cancellables)
    }
    
    private func setupSearchBar() {
        searchBar.delegate = self
    }
    
    // MARK: - Actions
    @objc private func addButtonTapped() {
        let addClientVC = AddClientViewController(businessId: businessId, clientManager: clientManager)
        let navController = UINavigationController(rootViewController: addClientVC)
        present(navController, animated: true)
    }
    
    // MARK: - Helper Methods
    private func updateUI() {
        let clients = isSearching ? filteredClients : clientManager.clients
        print("ClientsViewController: updateUI called with \(clients.count) clients, isSearching: \(isSearching)")
        emptyStateView.isHidden = !clients.isEmpty
        tableView.reloadData()
    }
    
    private var cancellables = Set<AnyCancellable>()
}

// MARK: - UITableViewDataSource
extension ClientsViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return isSearching ? filteredClients.count : clientManager.clients.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ClientTableViewCell.identifier, for: indexPath) as! ClientTableViewCell
        let clients = isSearching ? filteredClients : clientManager.clients
        cell.configure(with: clients[indexPath.row])
        return cell
    }
}

// MARK: - UITableViewDelegate
extension ClientsViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let clients = isSearching ? filteredClients : clientManager.clients
        let client = clients[indexPath.row]
        
        let clientDetailVC = ClientDetailViewController(client: client)
        navigationController?.pushViewController(clientDetailVC, animated: true)
    }
}

// MARK: - UISearchBarDelegate
extension ClientsViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        if searchText.isEmpty {
            isSearching = false
            filteredClients = []
        } else {
            isSearching = true
            filteredClients = clientManager.searchClients(query: searchText)
        }
        updateUI()
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}
