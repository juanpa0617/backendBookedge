import { ServiceRepository } from '../repositories/serviceRepository.js';

export class ServiceService {
    constructor() {
        this.serviceRepository = new ServiceRepository();
    }
    async createService(data) {
        return this.serviceRepository.createService(data);
    }
    async getAllServices() {
        return this.serviceRepository.getAllServices();
    }
    async getServiceById(id) {
        return this.serviceRepository.getServiceById(id);
    }
    async updateService(id, data) {
        return this.serviceRepository.updateService(id, data);
    }
    async deleteService(id) {
        return this.serviceRepository.deleteService(id);
    }
}
