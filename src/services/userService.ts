import { UserRepository } from '../repositories/userRepository.ts';
import type { CreateUserInput } from '../schemas/userSchema.ts';
import { hashPassword } from './password.ts';

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async getUsers() {
    return this.userRepository.findAll();
  }

  async createUser(input: CreateUserInput) {
    const passwordHash = await hashPassword(input.password);
    return this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });
  }
}