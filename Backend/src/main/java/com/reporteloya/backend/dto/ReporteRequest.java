    package com.reporteloya.backend.dto;

    import org.springframework.web.multipart.MultipartFile;

    import lombok.Getter;
    import lombok.Setter;

    import java.util.List;


    @Setter
    @Getter
    public class ReporteRequest {

        private String descripcion;
        private String direccion;
        private Double latitud;
        private Double longitud;
        private String placa;
        private String fechaIncidente;
        private String horaIncidente;
        private String tipoInfraccion;
        private List<MultipartFile> archivos;

        // getters y setters
        // public String getDescripcion() {
        //     return descripcion;
        // }

        // public void setDescripcion(String descripcion) {
        //     this.descripcion = descripcion;
        // }

        // public String getDireccion() {
        //     return direccion;
        // }

        // public void setDireccion(String direccion) {
        //     this.direccion = direccion;
        // }

        // public Double getLatitud() {
        //     return latitud;
        // }

        // public void setLatitud(Double latitud) {
        //     this.latitud = latitud;
        // }

        // public Double getLongitud() {
        //     return longitud;
        // }

        // public void setLongitud(Double longitud) {
        //     this.longitud = longitud;
        // }

        // public String getPlaca() {
        //     return placa;
        // }

        // public void setPlaca(String placa) {
        //     this.placa = placa;
        // }

        // public String getFechaIncidente() {
        //     return fechaIncidente;
        // }

        // public void setFechaIncidente(String fechaIncidente) {
        //     this.fechaIncidente = fechaIncidente;
        // }

        // public String getHoraIncidente() {
        //     return horaIncidente;
        // }

        // public void setHoraIncidente(String horaIncidente) {
        //     this.horaIncidente = horaIncidente;
        // }

        // public String getTipoInfraccion() {
        //     return tipoInfraccion;
        // }

        // public void setTipoInfraccion(String tipoInfraccion) {
        //     this.tipoInfraccion = tipoInfraccion;
        // }

        // public List<MultipartFile> getArchivos() {
        // 	return archivos;
        // }

        // public void setArchivos(List<MultipartFile> archivos) {
        // 	this.archivos = archivos;
        // }
    }
