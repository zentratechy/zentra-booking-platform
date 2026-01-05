//
//  CalendarDayCell.swift
//  Zentra
//
//  Created by James Clark on 25/10/2025.
//

import UIKit

class CalendarDayCell: UICollectionViewCell {
    static let identifier = "CalendarDayCell"
    
    // MARK: - UI Elements
    private let dayLabel: UILabel = {
        let label = UILabel()
        label.textAlignment = .center
        label.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let dotView: UIView = {
        let view = UIView()
        view.backgroundColor = ThemeManager.Colors.primary
        view.layer.cornerRadius = 3
        view.isHidden = true
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupConstraints()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    private func setupUI() {
        contentView.addSubview(dayLabel)
        contentView.addSubview(dotView)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Day Label
            dayLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            dayLabel.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            
            // Dot View
            dotView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            dotView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -4),
            dotView.widthAnchor.constraint(equalToConstant: 6),
            dotView.heightAnchor.constraint(equalToConstant: 6)
        ])
    }
    
    // MARK: - Configuration
    func configureAsHeader(with text: String) {
        dayLabel.text = text
        dayLabel.textColor = .systemGray
        dayLabel.font = UIFont.systemFont(ofSize: 14, weight: .semibold)
        dotView.isHidden = true
        contentView.backgroundColor = .clear
    }
    
    func configure(with date: Date, hasAppointments: Bool, isSelected: Bool) {
        let calendar = Calendar.current
        let day = calendar.component(.day, from: date)
        dayLabel.text = "\(day)"
        
        if isSelected {
            dayLabel.textColor = .white
            contentView.backgroundColor = ThemeManager.Colors.primary
            contentView.layer.cornerRadius = 16
        } else {
            dayLabel.textColor = ThemeManager.Colors.label
            contentView.backgroundColor = .clear
            contentView.layer.cornerRadius = 0
        }
        
        dotView.isHidden = !hasAppointments
    }
    
    func configureEmpty() {
        dayLabel.text = ""
        dayLabel.textColor = .clear
        dotView.isHidden = true
        contentView.backgroundColor = .clear
    }
}

