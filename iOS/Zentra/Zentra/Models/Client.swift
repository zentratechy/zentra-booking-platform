//
//  Client.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation
import FirebaseFirestore

struct Client {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let dateOfBirth: Date?
    let loyaltyPoints: Int
    let totalSpent: Double
    let lastVisit: Date?
    let businessId: String
    let createdAt: Date
}

// MARK: - Firestore Document Mapping
extension Client {
    init?(from dictionary: [String: Any], id: String) {
        guard let name = dictionary["name"] as? String,
              let businessId = dictionary["businessId"] as? String else {
            return nil
        }
        
        self.id = id
        self.name = name
        self.email = dictionary["email"] as? String
        self.phone = dictionary["phone"] as? String
        self.loyaltyPoints = dictionary["loyaltyPoints"] as? Int ?? 0
        self.totalSpent = dictionary["totalSpent"] as? Double ?? 0.0
        self.businessId = businessId
        
        // Handle date fields
        if let dateOfBirthTimestamp = dictionary["dateOfBirth"] as? Timestamp {
            self.dateOfBirth = dateOfBirthTimestamp.dateValue()
        } else {
            self.dateOfBirth = nil
        }
        
        if let lastVisitTimestamp = dictionary["lastVisit"] as? Timestamp {
            self.lastVisit = lastVisitTimestamp.dateValue()
        } else {
            self.lastVisit = nil
        }
        
        if let createdAtTimestamp = dictionary["createdAt"] as? Timestamp {
            self.createdAt = createdAtTimestamp.dateValue()
        } else {
            self.createdAt = Date()
        }
    }
    
    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "name": name,
            "businessId": businessId,
            "loyaltyPoints": loyaltyPoints,
            "totalSpent": totalSpent
        ]
        
        if let email = email {
            dict["email"] = email
        }
        
        if let phone = phone {
            dict["phone"] = phone
        }
        
        if let dateOfBirth = dateOfBirth {
            dict["dateOfBirth"] = Timestamp(date: dateOfBirth)
        }
        
        if let lastVisit = lastVisit {
            dict["lastVisit"] = Timestamp(date: lastVisit)
        }
        
        dict["createdAt"] = Timestamp(date: createdAt)
        
        return dict
    }
}
