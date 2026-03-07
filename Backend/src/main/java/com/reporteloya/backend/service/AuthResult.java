package com.reporteloya.backend.service;

import com.reporteloya.backend.entity.Usuario;


    public record AuthResult(String token, Usuario usuario) {
}

