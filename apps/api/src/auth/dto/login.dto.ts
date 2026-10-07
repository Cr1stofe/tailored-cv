import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "email deve ser um endereço válido" })
  email: string;

  @IsString({ message: "senha deve ser uma string" })
  @IsNotEmpty({ message: "senha é obrigatória" })
  @MinLength(6, { message: "senha deve conter no mínimo 6 caracteres" })
  password: string;
}
