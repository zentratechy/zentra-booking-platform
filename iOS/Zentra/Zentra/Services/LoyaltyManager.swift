//
//  LoyaltyManager.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation
import FirebaseFirestore

class LoyaltyManager {
    static let shared = LoyaltyManager()
    
    private let db = Firestore.firestore()
    
    private init() {}
    
    /// Award loyalty points to a client when an appointment is completed
    /// - Parameters:
    ///   - businessId: The business ID
    ///   - clientId: The client ID
    ///   - appointmentAmount: The amount paid for the appointment
    ///   - appointmentId: The appointment ID (to mark as loyaltyAwarded)
    /// - Returns: Success status and points awarded
    func awardLoyaltyPoints(
        businessId: String,
        clientId: String,
        appointmentAmount: Double,
        appointmentId: String
    ) async throws -> (success: Bool, pointsAwarded: Int) {
        // Get business loyalty settings
        let businessDoc = try await db.collection("businesses").document(businessId).getDocument()
        
        guard businessDoc.exists,
              let businessData = businessDoc.data(),
              let loyaltyProgram = businessData["loyaltyProgram"] as? [String: Any] else {
            return (false, 0)
        }
        
        // Check if loyalty program is active
        guard let active = loyaltyProgram["active"] as? Bool, active else {
            return (false, 0)
        }
        
        // Get points per dollar setting (default to 1)
        let settings = loyaltyProgram["settings"] as? [String: Any] ?? [:]
        let pointsPerDollar = settings["pointsPerDollar"] as? Int ?? 1
        
        // Calculate points to award
        let pointsToAward = Int(appointmentAmount) * pointsPerDollar
        
        if pointsToAward <= 0 {
            return (false, 0)
        }
        
        // Update client's loyalty points
        let clientRef = db.collection("clients").document(clientId)
        try await clientRef.updateData([
            "loyaltyPoints": FieldValue.increment(Int64(pointsToAward))
        ])
        
        // Mark appointment as loyalty awarded
        let appointmentRef = db.collection("appointments").document(appointmentId)
        try await appointmentRef.updateData([
            "loyaltyAwarded": true,
            "payment.loyaltyAwarded": true
        ])
        
        return (true, pointsToAward)
    }
    
    /// Award referral bonus points to the referrer when a referee completes their first appointment
    /// - Parameters:
    ///   - businessId: The business ID
    ///   - refereeClientId: The client who completed the appointment
    ///   - appointmentId: The appointment ID (to check if this is their first completed)
    /// - Returns: Success status and points awarded
    func awardReferralBonus(
        businessId: String,
        refereeClientId: String,
        appointmentId: String
    ) async throws -> (success: Bool, pointsAwarded: Int) {
        // Get business loyalty settings
        let businessDoc = try await db.collection("businesses").document(businessId).getDocument()
        
        guard businessDoc.exists,
              let businessData = businessDoc.data(),
              let loyaltyProgram = businessData["loyaltyProgram"] as? [String: Any] else {
            return (false, 0)
        }
        
        // Check if referral program is enabled
        let settings = loyaltyProgram["settings"] as? [String: Any] ?? [:]
        let referralSettings = settings["referral"] as? [String: Any] ?? [:]
        let referralEnabled = referralSettings["enabled"] as? Bool ?? settings["referralEnabled"] as? Bool ?? true
        
        guard referralEnabled else {
            return (false, 0)
        }
        
        // Get referral bonus amount
        let referralBonus = referralSettings["bonus"] as? Int ?? 100 // Default 100 points
        
        if referralBonus <= 0 {
            return (false, 0)
        }
        
        // Get client to find referrer
        let clientDoc = try await db.collection("clients").document(refereeClientId).getDocument()
        guard clientDoc.exists,
              let clientData = clientDoc.data(),
              let referredBy = clientData["referredBy"] as? String else {
            return (false, 0)
        }
        
        // Check if this is the referee's first completed appointment
        // Query for completed appointments excluding current one
        let appointmentsSnapshot = try await db.collection("appointments")
            .whereField("clientId", isEqualTo: refereeClientId)
            .whereField("status", isEqualTo: "completed")
            .getDocuments()
        
        // Filter out current appointment
        let previousCompletedCount = appointmentsSnapshot.documents.filter { $0.documentID != appointmentId }.count
        
        // Only award referral bonus if this is the first completed appointment
        guard previousCompletedCount == 0 else {
            return (false, 0)
        }
        
        // Award referral bonus to referrer
        let referrerRef = db.collection("clients").document(referredBy)
        try await referrerRef.updateData([
            "loyaltyPoints": FieldValue.increment(Int64(referralBonus))
        ])
        
        return (true, referralBonus)
    }
    
    /// Update client's total spent and visit count when appointment is completed
    /// - Parameters:
    ///   - clientId: The client ID
    ///   - amount: The amount to add to totalSpent
    func updateClientStats(clientId: String, amount: Double) async throws {
        let clientRef = db.collection("clients").document(clientId)
        
        // Get current values
        let clientDoc = try await clientRef.getDocument()
        let currentTotalSpent = clientDoc.data()?["totalSpent"] as? Double ?? 0.0
        
        // Update total spent
        try await clientRef.updateData([
            "totalSpent": currentTotalSpent + amount,
            "lastVisit": Timestamp(date: Date())
        ])
    }
}




