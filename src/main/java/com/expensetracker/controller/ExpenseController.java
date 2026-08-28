package com.expensetracker.controller;

import com.expensetracker.entity.Expense;
import com.expensetracker.entity.User;
import com.expensetracker.service.ExpenseService;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.UserRepository;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;

    public ExpenseController(
            ExpenseService expenseService,
            UserRepository userRepository,
            ExpenseRepository expenseRepository) {

        this.expenseService = expenseService;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
    }

    // ADD EXPENSE
    @PostMapping
    public Expense addExpense(
            @RequestParam Long userId,
            @RequestBody Expense expense) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        return expenseService.addExpense(expense, user);
    }

    // GET EXPENSES
    @GetMapping
    public List<Expense> getUserExpenses(
            @RequestParam(required = false) Long userId) {

        if (userId != null) {
            return expenseService.getUserExpenses(userId);
        }

        return expenseRepository.findAll();
    }

    // DELETE EXPENSE
    @DeleteMapping("/{id}")
    public String deleteExpense(
            @PathVariable Long id,
            @RequestParam Long userId) {

        expenseService.deleteExpense(id, userId);

        return "Expense deleted successfully";
    }
}