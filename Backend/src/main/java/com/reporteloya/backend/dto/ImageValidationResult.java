package com.reporteloya.backend.dto;

public class ImageValidationResult {
    private boolean valida;
    private boolean tieneVehiculo;
    private boolean tienePlacaColombia;
    private boolean tieneCarretera;
    private boolean tieneMoto;
    private boolean tieneSenalesTrafico;
    private boolean tieneParqueadero;
    private boolean tieneSemaforo;
    private boolean tieneSenalVertical;
    private String placaDetectada;
    private String motivoRechazo;
    private java.util.List<String> labelsDetectados;
    private String tipoInfraccion;

    public ImageValidationResult() {
        this.labelsDetectados = new java.util.ArrayList<>();
    }

    public ImageValidationResult(boolean valida) {
        this.valida = valida;
        this.labelsDetectados = new java.util.ArrayList<>();
    }

    // Getters y Setters
    public boolean isValida() { return valida; }
    public void setValida(boolean valida) { this.valida = valida; }

    public boolean isTieneVehiculo() { return tieneVehiculo; }
    public void setTieneVehiculo(boolean tieneVehiculo) { this.tieneVehiculo = tieneVehiculo; }

    public boolean isTienePlacaColombia() { return tienePlacaColombia; }
    public void setTienePlacaColombia(boolean tienePlacaColombia) { this.tienePlacaColombia = tienePlacaColombia; }

    public boolean isTieneCarretera() { return tieneCarretera; }
    public void setTieneCarretera(boolean tieneCarretera) { this.tieneCarretera = tieneCarretera; }

    public boolean isTieneMoto() { return tieneMoto; }
    public void setTieneMoto(boolean tieneMoto) { this.tieneMoto = tieneMoto; }

    public boolean isTieneSenalesTrafico() { return tieneSenalesTrafico; }
    public void setTieneSenalesTrafico(boolean tieneSenalesTrafico) { this.tieneSenalesTrafico = tieneSenalesTrafico; }

    public boolean isTieneParqueadero() { return tieneParqueadero; }
    public void setTieneParqueadero(boolean tieneParqueadero) { this.tieneParqueadero = tieneParqueadero; }

    public boolean isTieneSemaforo() { return tieneSemaforo; }
    public void setTieneSemaforo(boolean tieneSemaforo) { this.tieneSemaforo = tieneSemaforo; }

    public boolean isTieneSenalVertical() { return tieneSenalVertical; }
    public void setTieneSenalVertical(boolean tieneSenalVertical) { this.tieneSenalVertical = tieneSenalVertical; }

    public String getPlacaDetectada() { return placaDetectada; }
    public void setPlacaDetectada(String placaDetectada) { this.placaDetectada = placaDetectada; }

    public String getMotivoRechazo() { return motivoRechazo; }
    public void setMotivoRechazo(String motivoRechazo) { this.motivoRechazo = motivoRechazo; }

    public java.util.List<String> getLabelsDetectados() { return labelsDetectados; }
    public void setLabelsDetectados(java.util.List<String> labelsDetectados) { this.labelsDetectados = labelsDetectados; }

    public String getTipoInfraccion() { return tipoInfraccion; }
    public void setTipoInfraccion(String tipoInfraccion) { this.tipoInfraccion = tipoInfraccion; }
}