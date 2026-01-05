//
//  ClientManager.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import Foundation
import FirebaseFirestore
import Combine

class ClientManager: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    private let businessId: String
    
    init(businessId: String) {
        self.businessId = businessId
        startListening()
    }
    
    func startListening(businessId: String? = nil) {
        stopListening()
        
        let targetBusinessId = businessId ?? self.businessId
        print("ClientManager: Starting to listen for clients with businessId: \(targetBusinessId)")
        isLoading = true
        
        // First, let's try to get all clients to see what's in the database
        db.collection("clients").getDocuments { snapshot, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("ClientManager: Error fetching all clients: \(error.localizedDescription)")
                } else {
                    print("ClientManager: Total clients in database: \(snapshot?.documents.count ?? 0)")
                    if let documents = snapshot?.documents {
                        for document in documents {
                            let data = document.data()
                            print("ClientManager: Client document \(document.documentID): \(data)")
                        }
                    }
                }
            }
        }
        
        listener = db.collection("clients")
            .whereField("businessId", isEqualTo: targetBusinessId)
            .order(by: "name")
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false
                    
                    if let error = error {
                        print("ClientManager: Error fetching clients: \(error.localizedDescription)")
                        self?.errorMessage = error.localizedDescription
                        return
                    }
                    
                    guard let documents = snapshot?.documents else {
                        print("ClientManager: No documents found")
                        self?.clients = []
                        return
                    }
                    
                    print("ClientManager: Found \(documents.count) client documents")
                    self?.clients = documents.compactMap { document in
                        let client = Client(from: document.data(), id: document.documentID)
                        if let client = client {
                            print("ClientManager: Successfully parsed client: \(client.name)")
                        } else {
                            print("ClientManager: Failed to parse client from document: \(document.documentID)")
                        }
                        return client
                    }
                    print("ClientManager: Total clients loaded: \(self?.clients.count ?? 0)")
                    self?.errorMessage = nil
                }
            }
    }
    
    func stopListening() {
        listener?.remove()
        listener = nil
    }
    
    func addClient(_ client: Client, completion: @escaping (Result<Void, Error>) -> Void) {
        db.collection("clients").addDocument(data: client.dictionary) { error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        }
    }
    
    func updateClient(_ client: Client, completion: @escaping (Result<Void, Error>) -> Void) {
        db.collection("clients").document(client.id).setData(client.dictionary) { error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        }
    }
    
    func deleteClient(_ client: Client, completion: @escaping (Result<Void, Error>) -> Void) {
        db.collection("clients").document(client.id).delete { error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        }
    }
    
    func searchClients(query: String) -> [Client] {
        if query.isEmpty {
            return clients
        }
        
        return clients.filter { client in
            client.name.localizedCaseInsensitiveContains(query) ||
            client.email?.localizedCaseInsensitiveContains(query) == true ||
            client.phone?.localizedCaseInsensitiveContains(query) == true
        }
    }
}
