//
//  User.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation

struct User {
    let uid: String
    let email: String
    let businessId: String
    let role: UserRole
    
    enum UserRole: String, CaseIterable {
        case owner = "owner"
        case staff = "staff"
    }
    
    init(uid: String, email: String, businessId: String, role: UserRole) {
        self.uid = uid
        self.email = email
        self.businessId = businessId
        self.role = role
    }
}

// MARK: - Firestore Document Mapping
extension User {
    init?(from dictionary: [String: Any], uid: String) {
        guard let email = dictionary["email"] as? String,
              let businessId = dictionary["businessId"] as? String,
              let roleString = dictionary["role"] as? String,
              let role = UserRole(rawValue: roleString) else {
            return nil
        }
        
        self.uid = uid
        self.email = email
        self.businessId = businessId
        self.role = role
    }
    
    var dictionary: [String: Any] {
        return [
            "email": email,
            "businessId": businessId,
            "role": role.rawValue
        ]
    }
}
