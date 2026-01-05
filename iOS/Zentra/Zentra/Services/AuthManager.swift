//
//  AuthManager.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation
import FirebaseAuth
import FirebaseFirestore
import Combine

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    
    private let db = Firestore.firestore()
    
    private init() {
        _ = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            if let user = user {
                self?.fetchUserData(uid: user.uid)
            } else {
                self?.currentUser = nil
                self?.isAuthenticated = false
            }
        }
    }
    
    func signIn(email: String, password: String, completion: @escaping (Result<Void, Error>) -> Void) {
        isLoading = true
        
        Auth.auth().signIn(withEmail: email, password: password) { [weak self] result, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                if let error = error {
                    completion(.failure(error))
                } else if let user = result?.user {
                    self?.fetchUserData(uid: user.uid, completion: completion)
                } else {
                    completion(.failure(AuthError.unknown))
                }
            }
        }
    }
    
    func signOut() {
        do {
            try Auth.auth().signOut()
            currentUser = nil
            isAuthenticated = false
        } catch {
            print("Error signing out: \(error)")
        }
    }
    
    private func fetchUserData(uid: String, completion: ((Result<Void, Error>) -> Void)? = nil) {
        db.collection("businesses").document(uid).getDocument { [weak self] document, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion?(.failure(error))
                    return
                }
                
                guard let document = document,
                      document.exists,
                      let businessData = document.data() else {
                    completion?(.failure(AuthError.userNotFound))
                    return
                }
                
                // Create user from business data
                let user = User(
                    uid: uid,
                    email: businessData["email"] as? String ?? "",
                    businessId: uid,
                    role: .owner
                )
                
                self?.currentUser = user
                self?.isAuthenticated = true
                completion?(.success(()))
            }
        }
    }
}

enum AuthError: LocalizedError {
    case userNotFound
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .userNotFound:
            return "User data not found. Please contact support."
        case .unknown:
            return "An unknown error occurred. Please try again."
        }
    }
}
