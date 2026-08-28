package com.expensetracker.controller;

import com.expensetracker.entity.User;
import com.expensetracker.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // =========================================================
    // REGISTER
    // =========================================================

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody User user) {

        if (user.getName() == null ||
            user.getName().trim().isEmpty()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Name is required"
                    ));
        }

        if (user.getEmail() == null ||
            user.getEmail().trim().isEmpty()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email is required"
                    ));
        }

        if (user.getPassword() == null ||
            user.getPassword().length() < 6) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Password must contain at least 6 characters"
                    ));
        }

        String email =
                user.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email already registered"
                    ));
        }

        user.setEmail(email);

        User savedUser =
                userRepository.save(user);

        Map<String, Object> response =
                new HashMap<>();

        response.put("message",
                "Registration successful");

        response.put("id",
                savedUser.getId());

        response.put("name",
                savedUser.getName());

        response.put("email",
                savedUser.getEmail());

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody User loginUser) {

        if (loginUser.getEmail() == null ||
            loginUser.getPassword() == null) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required"
                    ));
        }

        String email =
                loginUser.getEmail()
                        .trim()
                        .toLowerCase();

        Optional<User> userOptional =
                userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {

            return ResponseEntity.status(401)
                    .body(Map.of(
                            "message",
                            "Invalid email or password"
                    ));
        }

        User user =
                userOptional.get();

        if (!user.getPassword()
                .equals(loginUser.getPassword())) {

            return ResponseEntity.status(401)
                    .body(Map.of(
                            "message",
                            "Invalid email or password"
                    ));
        }

        Map<String, Object> response =
                new HashMap<>();

        response.put("message",
                "Login successful");

        response.put("id",
                user.getId());

        response.put("name",
                user.getName());

        response.put("email",
                user.getEmail());

        return ResponseEntity.ok(response);
    }
}