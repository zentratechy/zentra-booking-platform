//
//  ConfigurationManager.swift
//  Zentra
//
//  Created by James Clark on 26/10/2025.
//

import Foundation
import FirebaseFirestore

class ConfigurationManager {
    static let shared = ConfigurationManager()
    
    private let db = Firestore.firestore()
    private var config: [String: String] = [:]
    
    // Configuration keys
    private enum ConfigKeys {
        static let resendApiKey = "resend_api_key"
        static let apiBaseUrl = "api_base_url"
        static let paymentLinkBaseUrl = "payment_link_base_url"
    }
    
    private init() {
        loadConfiguration()
    }
    
    private func loadConfiguration() {
        db.collection("config").document("api_keys").getDocument { [weak self] document, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("ConfigurationManager: Error loading config: \(error.localizedDescription)")
                    self?.setDefaultValues()
                    return
                }
                
                if let document = document, document.exists,
                   let data = document.data() {
                    self?.config = data.compactMapValues { $0 as? String }
                    print("ConfigurationManager: Config loaded successfully")
                } else {
                    print("ConfigurationManager: No config document found, using defaults")
                    self?.setDefaultValues()
                }
            }
        }
    }
    
    private func setDefaultValues() {
        config = [
            ConfigKeys.resendApiKey: "your_default_api_key",
            ConfigKeys.apiBaseUrl: "https://zentrabooking.com/api",
            ConfigKeys.paymentLinkBaseUrl: "https://zentrabooking.com/pay"
        ]
    }
    
    // MARK: - Public Methods
    
    var resendApiKey: String {
        return config[ConfigKeys.resendApiKey] ?? "your_default_api_key"
    }
    
    var apiBaseUrl: String {
        return config[ConfigKeys.apiBaseUrl] ?? "https://zentrabooking.com/api"
    }
    
    var paymentLinkBaseUrl: String {
        return config[ConfigKeys.paymentLinkBaseUrl] ?? "https://zentrabooking.com/pay"
    }
    
    func refreshConfig() {
        loadConfiguration()
    }
}
