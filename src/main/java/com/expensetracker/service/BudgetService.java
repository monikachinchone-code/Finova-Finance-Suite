package com.expensetracker.service;

import com.expensetracker.entity.Budget;
import com.expensetracker.entity.User;
import com.expensetracker.repository.BudgetRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;

    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    // Add budget
    public Budget addBudget(Budget budget, User user) {
        budget.setUser(user);
        return budgetRepository.save(budget);
    }

    // Get budgets for specific user
    public List<Budget> getUserBudgets(Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    // Get budget by ID for specific user
    public Budget getBudgetById(Long id, Long userId) {

        Budget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Budget not found"));

        if (budget.getUser() == null ||
            !budget.getUser().getId().equals(userId)) {

            throw new RuntimeException(
                    "You are not allowed to access this budget"
            );
        }

        return budget;
    }

    // Update budget
    public Budget updateBudget(
            Long id,
            Long userId,
            Budget budgetDetails) {

        Budget budget = getBudgetById(id, userId);

        budget.setCategory(budgetDetails.getCategory());
        budget.setAmount(budgetDetails.getAmount());
        budget.setMonth(budgetDetails.getMonth());

        return budgetRepository.save(budget);
    }

    // Delete budget
    public void deleteBudget(Long id, Long userId) {

        Budget budget = getBudgetById(id, userId);

        budgetRepository.delete(budget);
    }
}