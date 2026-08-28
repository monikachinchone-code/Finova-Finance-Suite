package com.expensetracker.service;

import com.expensetracker.entity.Income;
import com.expensetracker.entity.User;
import com.expensetracker.repository.IncomeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IncomeService {

    private final IncomeRepository incomeRepository;

    public IncomeService(IncomeRepository incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    public Income addIncome(Income income, User user) {
        income.setUser(user);
        return incomeRepository.save(income);
    }

    public List<Income> getUserIncome(Long userId) {
        return incomeRepository.findByUserId(userId);
    }

    public void deleteIncome(Long id, Long userId) {

        Income income = incomeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Income not found"));

        if (income.getUser() == null ||
            !income.getUser().getId().equals(userId)) {

            throw new RuntimeException(
                    "You are not allowed to delete this income"
            );
        }

        incomeRepository.delete(income);
    }
}