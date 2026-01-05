//
//  LoginViewController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit
import FirebaseAuth

class LoginViewController: UIViewController {
    
    // MARK: - UI Elements
    
    private let logoContainer: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let logoImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Zentra"
        label.font = UIFont.systemFont(ofSize: 48, weight: .light)
        label.textColor = UIColor(red: 0.25, green: 0.25, blue: 0.3, alpha: 1.0) // Soft dark gray
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        
        // Add subtle shadow for depth
        label.layer.shadowColor = UIColor.white.withAlphaComponent(0.5).cgColor
        label.layer.shadowOffset = CGSize(width: 0, height: 2)
        label.layer.shadowRadius = 8
        label.layer.shadowOpacity = 0.8
        
        // Apply letter spacing using attributed string
        let attributedString = NSMutableAttributedString(string: "Zentra")
        attributedString.addAttribute(.kern, value: 3.0, range: NSRange(location: 0, length: attributedString.length))
        label.attributedText = attributedString
        
        return label
    }()
    
    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Welcome back"
        label.font = UIFont.systemFont(ofSize: 18, weight: .light)
        label.textColor = UIColor(red: 0.4, green: 0.4, blue: 0.45, alpha: 1.0) // Medium gray
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        
        // Add subtle shadow for depth
        label.layer.shadowColor = UIColor.white.withAlphaComponent(0.4).cgColor
        label.layer.shadowOffset = CGSize(width: 0, height: 1)
        label.layer.shadowRadius = 4
        label.layer.shadowOpacity = 0.6
        
        // Apply letter spacing using attributed string
        let attributedString = NSMutableAttributedString(string: "Welcome back")
        attributedString.addAttribute(.kern, value: 1.0, range: NSRange(location: 0, length: attributedString.length))
        label.attributedText = attributedString
        
        return label
    }()
    
    private let formContainer: UIView = {
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
    
    private let formTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Sign In"
        label.font = UIFont.systemFont(ofSize: 28, weight: .light)
        label.textColor = UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1.0)
        label.textAlignment = .left
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let emailTextField: UITextField = {
        let textField = UITextField()
        textField.placeholder = "Email address"
        textField.borderStyle = .none
        textField.keyboardType = .emailAddress
        textField.autocapitalizationType = .none
        textField.autocorrectionType = .no
        textField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        textField.layer.cornerRadius = 16
        textField.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        textField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 20, height: 0))
        textField.leftViewMode = .always
        textField.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 20, height: 0))
        textField.rightViewMode = .always
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private let passwordTextField: UITextField = {
        let textField = UITextField()
        textField.placeholder = "Password"
        textField.borderStyle = .none
        textField.isSecureTextEntry = true
        textField.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.97, alpha: 1.0)
        textField.layer.cornerRadius = 16
        textField.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        textField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 20, height: 0))
        textField.leftViewMode = .always
        textField.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 20, height: 0))
        textField.rightViewMode = .always
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private let rememberMeContainer: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let rememberMeSwitch: UISwitch = {
        let switchControl = UISwitch()
        switchControl.onTintColor = UIColor(red: 0.9, green: 0.7, blue: 0.8, alpha: 1.0)
        switchControl.translatesAutoresizingMaskIntoConstraints = false
        return switchControl
    }()
    
    private let rememberMeLabel: UILabel = {
        let label = UILabel()
        label.text = "Remember me"
        label.font = UIFont.systemFont(ofSize: 15, weight: .regular)
        label.textColor = UIColor(red: 0.5, green: 0.5, blue: 0.5, alpha: 1.0)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let loginButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Sign In", for: .normal)
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
    
    private let activityIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.style = .medium
        indicator.color = .white
        indicator.hidesWhenStopped = true
        indicator.translatesAutoresizingMaskIntoConstraints = false
        return indicator
    }()
    
    private let errorLabel: UILabel = {
        let label = UILabel()
        label.textColor = UIColor(red: 0.9, green: 0.3, blue: 0.3, alpha: 1.0)
        label.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.isHidden = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // MARK: - Properties
    private let authManager = AuthManager.shared
    private let keychain = KeychainHelper.shared
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // CRITICAL: Ensure the main view allows all touches
        view.isUserInteractionEnabled = true
        
        setupUI()
        setupConstraints()
        setupActions()
        loadSavedCredentials()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }
    
    // MARK: - Setup
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateGradientLayer()
    }
    
    private func updateGradientLayer() {
        // Remove existing gradient
        view.layer.sublayers?.forEach { layer in
            if layer is CAGradientLayer {
                layer.removeFromSuperlayer()
            }
        }
        
        // Add luxury gradient background
        let gradientLayer = CAGradientLayer()
        gradientLayer.colors = [
            UIColor(red: 0.92, green: 0.88, blue: 0.90, alpha: 1.0).cgColor, // Soft rose
            UIColor(red: 0.95, green: 0.92, blue: 0.88, alpha: 1.0).cgColor, // Cream
            UIColor(red: 0.92, green: 0.90, blue: 0.92, alpha: 1.0).cgColor  // Soft lavender
        ]
        gradientLayer.locations = [0.0, 0.5, 1.0]
        gradientLayer.frame = view.bounds
        gradientLayer.startPoint = CGPoint(x: 0, y: 0)
        gradientLayer.endPoint = CGPoint(x: 1, y: 1)
        // Important: Make sure gradient doesn't block touches
        gradientLayer.isOpaque = false
        // Ensure view allows touches even with gradient layer
        view.isUserInteractionEnabled = true
        view.layer.insertSublayer(gradientLayer, at: 0)
    }
    
    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.95, green: 0.92, blue: 0.88, alpha: 1.0)
        
        // Logo container - transparent and non-interactive so it doesn't block
        logoContainer.isUserInteractionEnabled = false
        logoContainer.backgroundColor = .clear
        logoContainer.clipsToBounds = false
        
        // Logo elements also shouldn't block touches
        logoImageView.isUserInteractionEnabled = false
        titleLabel.isUserInteractionEnabled = false
        subtitleLabel.isUserInteractionEnabled = false
        
        view.addSubview(logoContainer)
        logoContainer.addSubview(logoImageView)
        logoContainer.addSubview(titleLabel)
        logoContainer.addSubview(subtitleLabel)
        
        // Form container - ensure it's interactive
        formContainer.isUserInteractionEnabled = true
        
        // Explicitly enable interaction for all interactive elements
        formTitleLabel.isUserInteractionEnabled = false // Label, no interaction needed
        emailTextField.isUserInteractionEnabled = true
        passwordTextField.isUserInteractionEnabled = true
        rememberMeContainer.isUserInteractionEnabled = true
        rememberMeLabel.isUserInteractionEnabled = false // Label
        rememberMeSwitch.isUserInteractionEnabled = true
        loginButton.isUserInteractionEnabled = true
        activityIndicator.isUserInteractionEnabled = false // Indicator
        errorLabel.isUserInteractionEnabled = false // Label
        
        view.addSubview(formContainer)
        formContainer.addSubview(formTitleLabel)
        formContainer.addSubview(emailTextField)
        formContainer.addSubview(passwordTextField)
        formContainer.addSubview(rememberMeContainer)
        rememberMeContainer.addSubview(rememberMeLabel)
        rememberMeContainer.addSubview(rememberMeSwitch)
        formContainer.addSubview(loginButton)
        formContainer.addSubview(activityIndicator)
        formContainer.addSubview(errorLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Logo Container
            logoContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 40),
            logoContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            logoContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            logoContainer.heightAnchor.constraint(equalToConstant: 200),
            
            // Logo Image
            logoImageView.topAnchor.constraint(equalTo: logoContainer.topAnchor),
            logoImageView.centerXAnchor.constraint(equalTo: logoContainer.centerXAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: 100),
            logoImageView.heightAnchor.constraint(equalToConstant: 100),
            
            // Title
            titleLabel.topAnchor.constraint(equalTo: logoImageView.bottomAnchor, constant: 24),
            titleLabel.centerXAnchor.constraint(equalTo: logoContainer.centerXAnchor),
            
            // Subtitle
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.centerXAnchor.constraint(equalTo: logoContainer.centerXAnchor),
            
            // Form Container
            formContainer.topAnchor.constraint(equalTo: logoContainer.bottomAnchor, constant: 40),
            formContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            formContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            formContainer.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            
            // Form Title
            formTitleLabel.topAnchor.constraint(equalTo: formContainer.topAnchor, constant: 32),
            formTitleLabel.leadingAnchor.constraint(equalTo: formContainer.leadingAnchor, constant: 28),
            formTitleLabel.trailingAnchor.constraint(equalTo: formContainer.trailingAnchor, constant: -28),
            
            // Email TextField
            emailTextField.topAnchor.constraint(equalTo: formTitleLabel.bottomAnchor, constant: 32),
            emailTextField.leadingAnchor.constraint(equalTo: formContainer.leadingAnchor, constant: 28),
            emailTextField.trailingAnchor.constraint(equalTo: formContainer.trailingAnchor, constant: -28),
            emailTextField.heightAnchor.constraint(equalToConstant: 56),
            
            // Password TextField
            passwordTextField.topAnchor.constraint(equalTo: emailTextField.bottomAnchor, constant: 20),
            passwordTextField.leadingAnchor.constraint(equalTo: formContainer.leadingAnchor, constant: 28),
            passwordTextField.trailingAnchor.constraint(equalTo: formContainer.trailingAnchor, constant: -28),
            passwordTextField.heightAnchor.constraint(equalToConstant: 56),
            
            // Remember Me Container
            rememberMeContainer.topAnchor.constraint(equalTo: passwordTextField.bottomAnchor, constant: 24),
            rememberMeContainer.leadingAnchor.constraint(equalTo: formContainer.leadingAnchor, constant: 28),
            rememberMeContainer.trailingAnchor.constraint(equalTo: formContainer.trailingAnchor, constant: -28),
            rememberMeContainer.heightAnchor.constraint(equalToConstant: 30),
            
            // Remember Me Label
            rememberMeLabel.leadingAnchor.constraint(equalTo: rememberMeContainer.leadingAnchor),
            rememberMeLabel.centerYAnchor.constraint(equalTo: rememberMeContainer.centerYAnchor),
            
            // Remember Me Switch
            rememberMeSwitch.trailingAnchor.constraint(equalTo: rememberMeContainer.trailingAnchor),
            rememberMeSwitch.centerYAnchor.constraint(equalTo: rememberMeContainer.centerYAnchor),
            
            // Login Button
            loginButton.topAnchor.constraint(equalTo: rememberMeContainer.bottomAnchor, constant: 32),
            loginButton.leadingAnchor.constraint(equalTo: formContainer.leadingAnchor, constant: 28),
            loginButton.trailingAnchor.constraint(equalTo: formContainer.trailingAnchor, constant: -28),
            loginButton.heightAnchor.constraint(equalToConstant: 56),
            
            // Activity Indicator
            activityIndicator.centerXAnchor.constraint(equalTo: loginButton.centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: loginButton.centerYAnchor),
            
            // Error Label
            errorLabel.topAnchor.constraint(equalTo: loginButton.bottomAnchor, constant: 20),
            errorLabel.leadingAnchor.constraint(equalTo: formContainer.leadingAnchor, constant: 28),
            errorLabel.trailingAnchor.constraint(equalTo: formContainer.trailingAnchor, constant: -28),
            errorLabel.bottomAnchor.constraint(equalTo: formContainer.bottomAnchor, constant: -32)
        ])
    }
    
    private func setupActions() {
        loginButton.addTarget(self, action: #selector(loginButtonTapped), for: .touchUpInside)
        
        // Add keyboard dismissal - only when tapping empty space
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false // Don't cancel touches on buttons/text fields
        tapGesture.delegate = self
        view.addGestureRecognizer(tapGesture)
    }
    
    // MARK: - Actions
    @objc private func loginButtonTapped() {
        guard let email = emailTextField.text, !email.isEmpty,
              let password = passwordTextField.text, !password.isEmpty else {
            showError("Please enter both email and password")
            return
        }
        
        dismissKeyboard()
        showLoading(true)
        hideError()
        
        authManager.signIn(email: email, password: password) { [weak self] result in
            DispatchQueue.main.async {
                self?.showLoading(false)
                
                switch result {
                case .success:
                    // Check subscription/trial status before proceeding
                    self?.checkSubscriptionAndTrialStatus { [weak self] hasValidAccess in
                        if hasValidAccess {
                            // Save credentials if remember me is enabled
                            if self?.rememberMeSwitch.isOn == true {
                                self?.saveCredentials(email: email, password: password)
                            } else {
                                self?.clearSavedCredentials()
                            }
                            self?.presentMainApp()
                        } else {
                            // Sign out since they don't have valid access
                            AuthManager.shared.signOut()
                            self?.showError("")
                        }
                    }
                case .failure(let error):
                    self?.showError(error.localizedDescription)
                }
            }
        }
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    // MARK: - Helper Methods
    private func showLoading(_ show: Bool) {
        if show {
            activityIndicator.startAnimating()
            loginButton.setTitle("", for: .normal)
        } else {
            activityIndicator.stopAnimating()
            loginButton.setTitle("Sign In", for: .normal)
        }
        loginButton.isEnabled = !show
    }
    
    private func showError(_ message: String) {
        errorLabel.text = message
        errorLabel.isHidden = false
    }
    
    private func hideError() {
        errorLabel.isHidden = true
    }
    
    private func checkSubscriptionAndTrialStatus(completion: @escaping (Bool) -> Void) {
        guard let businessId = authManager.currentUser?.businessId else {
            showError("Business ID not found")
            completion(false)
            return
        }
        
        // Show checking status
        showLoading(true)
        
        // Call the trial status API
        guard let url = URL(string: "\(ConfigurationManager.shared.apiBaseUrl)/trial/status?businessId=\(businessId)") else {
            showError("Invalid API URL")
            showLoading(false)
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.showLoading(false)
                
                if let error = error {
                    // On API error, allow access (don't block user due to API issues)
                    print("Error checking subscription status: \(error.localizedDescription)")
                    completion(true)
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200,
                      let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    // On parse error, allow access
                    print("Error parsing subscription status response")
                    completion(true)
                    return
                }
                
                // Check trial status
                guard let trialValue = json["trial"], !(trialValue is NSNull) else {
                    // No trial object means no subscription
                    self?.showSubscriptionRequiredAlert()
                    completion(false)
                    return
                }
                
                // If trial exists, check its status
                guard let trial = trialValue as? [String: Any] else {
                    // Trial exists but is not a dictionary - unexpected format
                    self?.showSubscriptionRequiredAlert()
                    completion(false)
                    return
                }
                
                let expired = trial["expired"] as? Bool ?? false
                let overridden = trial["overridden"] as? Bool ?? false
                let active = trial["active"] as? Bool ?? false
                
                // User should be blocked if: trial expired and not overridden by subscription
                // OR no trial active and no subscription
                if expired && !overridden {
                    // Trial expired, no subscription
                    self?.showSubscriptionRequiredAlert()
                    completion(false)
                    return
                }
                
                if !active && !overridden {
                    // No active trial and no subscription
                    self?.showSubscriptionRequiredAlert()
                    completion(false)
                    return
                }
                
                // User has valid access (active trial or subscription)
                completion(true)
            }
        }.resume()
    }
    
    private func showSubscriptionRequiredAlert() {
        let alert = UIAlertController(
            title: "Subscription Required",
            message: "Your trial has expired or you do not have an active subscription. Please log in via the web portal at zentrabooking.com to update your subscription.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            // Clear credentials on logout
            self?.clearSavedCredentials()
        })
        
        present(alert, animated: true)
    }
    
    private func presentMainApp() {
        guard let businessId = authManager.currentUser?.businessId else {
            showError("Business ID not found")
            return
        }
        let tabBarController = MainTabBarController(businessId: businessId)
        tabBarController.modalPresentationStyle = .fullScreen
        present(tabBarController, animated: true)
    }
    
    // MARK: - Credential Management
    private func loadSavedCredentials() {
        if let savedEmail = keychain.loadString(forKey: "saved_email"),
           let savedPassword = keychain.loadString(forKey: "saved_password") {
            emailTextField.text = savedEmail
            passwordTextField.text = savedPassword
            rememberMeSwitch.isOn = true
        }
    }
    
    private func saveCredentials(email: String, password: String) {
        _ = keychain.saveString(email, forKey: "saved_email")
        _ = keychain.saveString(password, forKey: "saved_password")
    }
    
    private func clearSavedCredentials() {
        _ = keychain.delete(forKey: "saved_email")
        _ = keychain.delete(forKey: "saved_password")
    }
}

// MARK: - UIGestureRecognizerDelegate
extension LoginViewController: UIGestureRecognizerDelegate {
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        // Don't interfere with touches on interactive elements
        let view = touch.view
        if view is UIButton || view is UITextField || view is UISwitch {
            return false
        }
        return true
    }
}

