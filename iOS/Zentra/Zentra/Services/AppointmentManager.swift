//
//  AppointmentManager.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation
import FirebaseFirestore
import Combine

class AppointmentManager: ObservableObject {
    @Published var appointments: [Appointment] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    func startListening(businessId: String) {
        stopListening()
        
        print("AppointmentManager: Starting to listen for appointments with businessId: \(businessId)")
        isLoading = true
        listener = db.collection("appointments")
            .whereField("businessId", isEqualTo: businessId)
            .order(by: "date", descending: false)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false
                    
                    if let error = error {
                        print("AppointmentManager: Error fetching appointments: \(error.localizedDescription)")
                        self?.errorMessage = error.localizedDescription
                        return
                    }
                    
                    guard let documents = snapshot?.documents else {
                        print("AppointmentManager: No appointment documents found")
                        self?.appointments = []
                        return
                    }
                    
                    print("AppointmentManager: Found \(documents.count) appointment documents")
                    self?.appointments = documents.compactMap { document in
                        print("AppointmentManager: Processing document \(document.documentID) with data: \(document.data())")
                        let appointment = Appointment(from: document.data(), id: document.documentID)
                        if let appointment = appointment {
                            print("AppointmentManager: Successfully parsed appointment: \(appointment.clientName) - \(appointment.serviceName) - BusinessID: \(appointment.businessId)")
                        } else {
                            print("AppointmentManager: Failed to parse appointment from document: \(document.documentID)")
                        }
                        return appointment
                    }
                    print("AppointmentManager: Total appointments loaded: \(self?.appointments.count ?? 0)")
                    self?.errorMessage = nil
                }
            }
    }
    
    func stopListening() {
        listener?.remove()
        listener = nil
    }
    
    func getAppointmentsForDate(_ date: Date) -> [Appointment] {
        let calendar = Calendar.current
        return appointments.filter { appointment in
            calendar.isDate(appointment.date, inSameDayAs: date)
        }
    }
    
    func getAppointmentsForDateRange(_ startDate: Date, _ endDate: Date) -> [Appointment] {
        return appointments.filter { appointment in
            appointment.date >= startDate && appointment.date <= endDate
        }
    }
    
    func updateAppointmentStatus(_ appointment: Appointment, status: AppointmentStatus, completion: @escaping (Result<Void, Error>) -> Void) {
        var updatedData = appointment.dictionary
        updatedData["status"] = status.rawValue
        
        db.collection("appointments").document(appointment.id).setData(updatedData) { error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        }
    }
    
    func deleteAppointment(_ appointment: Appointment, completion: @escaping (Result<Void, Error>) -> Void) {
        db.collection("appointments").document(appointment.id).delete { error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        }
    }
}
