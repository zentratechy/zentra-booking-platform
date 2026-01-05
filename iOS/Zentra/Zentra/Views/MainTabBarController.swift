//
//  MainTabBarController.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class MainTabBarController: UITabBarController {
    
    private let businessId: String
    
    init(businessId: String) {
        self.businessId = businessId
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupTabBar()
        setupViewControllers()
    }
    
    private func setupTabBar() {
        tabBar.tintColor = ThemeManager.Colors.primary
        tabBar.unselectedItemTintColor = ThemeManager.Colors.secondaryLabel
        
        // Luxury spa aesthetic - semi-transparent white with blur
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.white.withAlphaComponent(0.9)
        
        // Add subtle shadow
        tabBar.layer.shadowColor = UIColor.black.cgColor
        tabBar.layer.shadowOffset = CGSize(width: 0, height: -2)
        tabBar.layer.shadowRadius = 8
        tabBar.layer.shadowOpacity = 0.1
        
        tabBar.standardAppearance = appearance
        if #available(iOS 15.0, *) {
            tabBar.scrollEdgeAppearance = appearance
        }
    }
    
    private func setupViewControllers() {
        let clientsVC = ClientsViewController(businessId: businessId)
        let clientsNav = UINavigationController(rootViewController: clientsVC)
        clientsNav.tabBarItem = UITabBarItem(
            title: "Customers",
            image: UIImage(systemName: "person.2.fill"),
            selectedImage: UIImage(systemName: "person.2.fill")
        )
        
        let paymentsVC = PaymentsViewController(businessId: businessId)
        let paymentsNav = UINavigationController(rootViewController: paymentsVC)
        paymentsNav.tabBarItem = UITabBarItem(
            title: "Payments",
            image: UIImage(systemName: "creditcard.fill"),
            selectedImage: UIImage(systemName: "creditcard.fill")
        )
        
        let calendarVC = CalendarViewController(businessId: businessId)
        let calendarNav = UINavigationController(rootViewController: calendarVC)
        calendarNav.tabBarItem = UITabBarItem(
            title: "Calendar",
            image: UIImage(systemName: "calendar"),
            selectedImage: UIImage(systemName: "calendar")
        )
        
        viewControllers = [clientsNav, paymentsNav, calendarNav]
    }
}
