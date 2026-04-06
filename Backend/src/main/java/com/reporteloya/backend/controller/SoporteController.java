package com.reporteloya.backend.controller;

import com.reporteloya.backend.dto.*;
import com.reporteloya.backend.service.SoporteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/soporte")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
public class SoporteController {

    private final SoporteService soporteService;

    @PostMapping("/crear")
    public ResponseEntity<?> crearTicket(
            @RequestBody CrearTicketRequest request,
            Authentication auth) {
        return soporteService.crearTicket(request, auth);
    }

    @GetMapping("/mis-tickets")
    public ResponseEntity<?> misTickets(Authentication auth) {
        return soporteService.obtenerTicketsPorUsuario(auth);
    }

    @GetMapping("/mis-tickets/{id}")
    public ResponseEntity<?> verMiTicket(
            @PathVariable Long id,
            Authentication auth) {
        return soporteService.obtenerTicketConMensajes(id, auth);
    }

    @PostMapping("/mis-tickets/{id}/responder")
    public ResponseEntity<?> responderMiTicket(
            @PathVariable Long id,
            @RequestBody ResponderTicketRequest request,
            Authentication auth) {
        return soporteService.agregarMensaje(id, request, auth);
    }

    @GetMapping("/admin/tickets")
    public ResponseEntity<?> todosLosTickets() {
        return soporteService.obtenerTodosLosTickets();
    }

    @GetMapping("/admin/tickets/{id}")
    public ResponseEntity<?> verTicketAdmin(@PathVariable Long id) {
        return soporteService.obtenerTicketAdmin(id);
    }

    @PostMapping("/admin/tickets/{id}/responder")
    public ResponseEntity<?> responderComoAdmin(
            @PathVariable Long id,
            @RequestBody ResponderTicketRequest request,
            Authentication auth) {
        return soporteService.responderComoAdmin(id, request, auth);
    }

    @PutMapping("/admin/tickets/{id}/cerrar")
    public ResponseEntity<?> cerrarTicket(@PathVariable Long id) {
        return soporteService.cerrarTicket(id);
    }

    @GetMapping("/admin/tickets/contador")
    public ResponseEntity<?> contadorTickets() {
        return soporteService.contarTickets();
    }
}
