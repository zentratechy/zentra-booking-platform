//
//  Appointment.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation
import FirebaseFirestore

struct Appointment {
    let id: String
    let clientId: String
    let clientName: String
    let clientEmail: String?
    let serviceName: String
    let serviceId: String
    let serviceCategory: String?
    let staffId: String?
    let staffName: String?
    let locationId: String?
    let locationName: String?
    let date: Date
    let duration: Int // in minutes
    let bufferTime: Int // in minutes
    let price: Double
    let status: AppointmentStatus
    let payment: PaymentInfo?
    let notes: String?
    let businessId: String
    let createdAt: Date
}

enum AppointmentStatus: String, CaseIterable {
    case pending = "pending"
    case confirmed = "confirmed"
    case arrived = "arrived"
    case started = "started"
    case completed = "completed"
    case noShow = "noShow"
    case cancelled = "cancelled"
}

struct PaymentInfo {
    let status: PaymentStatus
    let amount: Double
    let method: String?
    let transactionId: String?
    let paidAt: Date?
    let depositRequired: Bool?
    let depositPercentage: Int?
    let depositPaid: Bool?
    let remainingBalance: Double?
}

enum PaymentStatus: String, CaseIterable {
    case pending = "pending"
    case partial = "partial"
    case paid = "paid"
    case refunded = "refunded"
}

enum PaymentMethod: String, CaseIterable {
    case cash = "cash"
    case bankTransfer = "bankTransfer"
    case cardPayment = "cardPayment"
    case voucher = "voucher"
}

// MARK: - Firestore Document Mapping
extension Appointment {
    init?(from dictionary: [String: Any], id: String) {
        guard let clientId = dictionary["clientId"] as? String,
              let clientName = dictionary["clientName"] as? String,
              let serviceName = dictionary["serviceName"] as? String,
              let serviceId = dictionary["serviceId"] as? String,
              let businessId = dictionary["businessId"] as? String,
              let statusString = dictionary["status"] as? String,
              let status = AppointmentStatus(rawValue: statusString) else {
            return nil
        }
        
        self.id = id
        self.clientId = clientId
        self.clientName = clientName
        self.clientEmail = dictionary["clientEmail"] as? String
        self.serviceName = serviceName
        self.serviceId = serviceId
        self.serviceCategory = dictionary["serviceCategory"] as? String
        self.staffId = dictionary["staffId"] as? String
        self.staffName = dictionary["staffName"] as? String
        self.locationId = dictionary["locationId"] as? String
        self.locationName = dictionary["locationName"] as? String
        self.duration = dictionary["duration"] as? Int ?? 60
        self.bufferTime = dictionary["bufferTime"] as? Int ?? 0
        self.price = dictionary["price"] as? Double ?? 0.0
        self.status = status
        self.notes = dictionary["notes"] as? String
        self.businessId = businessId
        
        // Handle date fields - combine date timestamp with time string
        if let dateTimestamp = dictionary["date"] as? Timestamp {
            let baseDate = dateTimestamp.dateValue()
            
            // If there's a separate time field, combine it with the date
            if let timeString = dictionary["time"] as? String {
                // Parse time string (format: "HH:mm" or "H:mm")
                let timeComponents = timeString.split(separator: ":")
                if timeComponents.count == 2,
                   let hour = Int(timeComponents[0]),
                   let minute = Int(timeComponents[1]) {
                    // Create a calendar date with the correct time
                    let calendar = Calendar.current
                    var dateComponents = calendar.dateComponents([.year, .month, .day], from: baseDate)
                    dateComponents.hour = hour
                    dateComponents.minute = minute
                    dateComponents.timeZone = TimeZone.current
                    
                    if let combinedDate = calendar.date(from: dateComponents) {
                        self.date = combinedDate
                        print("Appointment: Combined date \(baseDate) with time \(timeString) = \(combinedDate)")
                    } else {
                        self.date = baseDate
                    }
                } else {
                    self.date = baseDate
                }
            } else {
                // No time field, use the date as-is
                self.date = baseDate
            }
        } else {
            return nil
        }
        
        if let createdAtTimestamp = dictionary["createdAt"] as? Timestamp {
            self.createdAt = createdAtTimestamp.dateValue()
        } else {
            self.createdAt = Date()
        }
        
        // Handle payment info
        if let paymentDict = dictionary["payment"] as? [String: Any] {
            self.payment = PaymentInfo(from: paymentDict)
        } else {
            self.payment = nil
        }
        
        // Note: endTime is not stored in the Appointment model as it's calculated from date + duration
    }
    
    var dictionary: [String: Any] {
        // Format time as HH:mm string for consistency with web app
        let calendar = Calendar.current
        let timeComponents = calendar.dateComponents([.hour, .minute], from: date)
        let timeString = String(format: "%02d:%02d", timeComponents.hour ?? 0, timeComponents.minute ?? 0)
        
        // Calculate endTime
        let endTimeDate = calendar.date(byAdding: .minute, value: duration, to: date) ?? date
        let endTimeComponents = calendar.dateComponents([.hour, .minute], from: endTimeDate)
        let endTimeString = String(format: "%02d:%02d", endTimeComponents.hour ?? 0, endTimeComponents.minute ?? 0)
        
        // Store date at noon to avoid timezone issues (matching web app pattern)
        var dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
        dateComponents.hour = 12
        dateComponents.minute = 0
        dateComponents.timeZone = TimeZone.current
        let noonDate = calendar.date(from: dateComponents) ?? date
        
        var dict: [String: Any] = [
            "clientId": clientId,
            "clientName": clientName,
            "serviceName": serviceName,
            "serviceId": serviceId,
            "businessId": businessId,
            "status": status.rawValue,
            "duration": duration,
            "bufferTime": bufferTime,
            "price": price,
            "date": Timestamp(date: noonDate),
            "time": timeString, // Store time separately
            "endTime": endTimeString, // Store end time separately
            "createdAt": Timestamp(date: createdAt)
        ]
        
        if let clientEmail = clientEmail {
            dict["clientEmail"] = clientEmail
        }
        
        if let serviceCategory = serviceCategory {
            dict["serviceCategory"] = serviceCategory
        }
        
        if let staffId = staffId {
            dict["staffId"] = staffId
        }
        
        if let staffName = staffName {
            dict["staffName"] = staffName
        }
        
        if let locationId = locationId {
            dict["locationId"] = locationId
        }
        
        if let locationName = locationName {
            dict["locationName"] = locationName
        }
        
        if let notes = notes {
            dict["notes"] = notes
        }
        
        if let payment = payment {
            dict["payment"] = payment.dictionary
        }
        
        return dict
    }
}

extension PaymentInfo {
    init?(from dictionary: [String: Any]) {
        guard let statusString = dictionary["status"] as? String,
              let status = PaymentStatus(rawValue: statusString),
              let amount = dictionary["amount"] as? Double else {
            return nil
        }
        
        self.status = status
        self.amount = amount
        self.method = dictionary["method"] as? String
        self.transactionId = dictionary["transactionId"] as? String
        self.depositRequired = dictionary["depositRequired"] as? Bool
        self.depositPercentage = dictionary["depositPercentage"] as? Int
        self.depositPaid = dictionary["depositPaid"] as? Bool
        self.remainingBalance = dictionary["remainingBalance"] as? Double
        
        if let paidAtTimestamp = dictionary["paidAt"] as? Timestamp {
            self.paidAt = paidAtTimestamp.dateValue()
        } else {
            self.paidAt = nil
        }
    }
    
    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "status": status.rawValue,
            "amount": amount
        ]
        
        if let method = method {
            dict["method"] = method
        }
        
        if let transactionId = transactionId {
            dict["transactionId"] = transactionId
        }
        
        if let paidAt = paidAt {
            dict["paidAt"] = Timestamp(date: paidAt)
        }
        
        if let depositRequired = depositRequired {
            dict["depositRequired"] = depositRequired
        }
        
        if let depositPercentage = depositPercentage {
            dict["depositPercentage"] = depositPercentage
        }
        
        if let depositPaid = depositPaid {
            dict["depositPaid"] = depositPaid
        }
        
        if let remainingBalance = remainingBalance {
            dict["remainingBalance"] = remainingBalance
        }
        
        return dict
    }
}
