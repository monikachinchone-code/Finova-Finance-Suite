package com.expensetracker.controller;

import com.expensetracker.entity.Income;
import com.expensetracker.entity.User;
import com.expensetracker.service.IncomeService;
import com.expensetracker.repository.IncomeRepository;
import com.expensetracker.repository.UserRepository;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incomes")
@CrossOrigin(origins = "*")
public class IncomeController {

    private final IncomeService incomeService;
    private final UserRepository userRepository;
    private final IncomeRepository incomeRepository;

    public IncomeController(
            IncomeService incomeService,
            UserRepository userRepository,
            IncomeRepository incomeRepository) {

        this.incomeService = incomeService;
        this.userRepository = userRepository;
        this.incomeRepository = incomeRepository;
    }

    // ADD INCOME
    @PostMapping
    public Income addIncome(
            @RequestParam Long userId,
            @RequestBody Income income) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        return incomeService.addIncome(income, user);
    }

    // GET INCOME
    @GetMapping
    public List<Income> getUserIncome(
            @RequestParam(required = false) Long userId) {

        if (userId != null) {
            return incomeService.getUserIncome(userId);
        }

        return incomeRepository.findAll();
    }

    // DELETE INCOME
    @DeleteMapping("/{id}")
    public String deleteIncome(
            @PathVariable Long id,
            @RequestParam Long userId) {

        incomeService.deleteIncome(id, userId);

        return "Income deleted successfully";
    }
}