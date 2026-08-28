package com.expensetracker.controller;

import com.expensetracker.entity.Budget;
import com.expensetracker.entity.User;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.BudgetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budget")
@CrossOrigin(origins = "*")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserRepository userRepository;

    public BudgetController(
            BudgetService budgetService,
            UserRepository userRepository) {
        this.budgetService = budgetService;
        this.userRepository = userRepository;
    }

    // Add budget
    @PostMapping
    public Budget addBudget(
            @RequestParam Long userId,
            @RequestBody Budget budget) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return budgetService.addBudget(budget, user);
    }

    // Get budgets for specific user
    @GetMapping
    public List<Budget> getUserBudgets(
            @RequestParam Long userId) {

        return budgetService.getUserBudgets(userId);
    }

    // Get budget by ID
    @GetMapping("/{id}")
    public Budget getBudgetById(
            @PathVariable Long id,
            @RequestParam Long userId) {

        return budgetService.getBudgetById(id, userId);
    }

    // Update budget
    @PutMapping("/{id}")
    public Budget updateBudget(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Budget budget) {

        return budgetService.updateBudget(
                id,
                userId,
                budget
        );
    }

    // Delete budget
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBudget(
            @PathVariable Long id,
            @RequestParam Long userId) {

        budgetService.deleteBudget(id, userId);

        return ResponseEntity.ok(
                "Budget deleted successfully"
        );
    }
}