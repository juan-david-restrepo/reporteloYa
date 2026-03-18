package com.reporteloya.backend.service;

import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.repository.AgenteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AgenteService {
    @Autowired
    private AgenteRepository agenteRepository;

    public List<Agentes> listarTodos() {
        return agenteRepository.findAll();
    }

    public Optional<Agentes> buscarPorPlaca(String placa) {
        return agenteRepository.findByPlacaIgnoreCase(placa);
    }

    public Agentes guardar(Agentes agente) {
        return agenteRepository.saveAndFlush(agente);
    }

    public Optional<Agentes> buscarPorEmail(String email) {
        return agenteRepository.findByEmail(email);
    }
}