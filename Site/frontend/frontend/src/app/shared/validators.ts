import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validadores personalizados para formulários do MedFlow
 */

/**
 * Valida CPF brasileiro (11 dígitos numéricos)
 */
export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Se vazio, deixa o required handle
    }

    const cpf = control.value.replace(/\D/g, ''); // Remove não-dígitos

    // Deve ter exatamente 11 dígitos
    if (cpf.length !== 11) {
      return { cpfInvalid: { value: control.value, message: 'CPF deve ter 11 dígitos' } };
    }

    // Verifica CPFs conhecidos como inválidos (todos iguais)
    if (/^(\d)\1{10}$/.test(cpf)) {
      return { cpfInvalid: { value: control.value, message: 'CPF inválido' } };
    }

    // Validação do dígito verificador
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
      return { cpfInvalid: { value: control.value, message: 'CPF inválido' } };
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
      return { cpfInvalid: { value: control.value, message: 'CPF inválido' } };
    }

    return null;
  };
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const phone = control.value.replace(/\D/g, '');

    // Deve ter 10 (fixo) ou 11 (celular) dígitos
    if (phone.length < 10 || phone.length > 11) {
      return { phoneInvalid: { value: control.value, message: 'Telefone deve ter 10 ou 11 dígitos' } };
    }

    // Não pode começar com 0
    if (phone[0] === '0') {
      return { phoneInvalid: { value: control.value, message: 'Telefone inválido' } };
    }

    return null;
  };
}

/**
 * Valida que a data não está no futuro
 */
export function notFutureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignora horas

    if (inputDate > today) {
      return { futureDate: { value: control.value, message: 'Data não pode estar no futuro' } };
    }

    return null;
  };
}

/**
 * Valida data de nascimento (não no futuro, idade mínima e máxima razoável)
 */
export function birthDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const birthDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Não pode estar no futuro
    if (birthDate > today) {
      return { birthDateInvalid: { value: control.value, message: 'Data de nascimento não pode estar no futuro' } };
    }

    // Calcula idade
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Idade mínima: 18 anos (para médicos)
    if (age < 18) {
      return { birthDateInvalid: { value: control.value, message: 'Idade mínima: 18 anos' } };
    }

    // Idade máxima: 120 anos (razoável)
    if (age > 120) {
      return { birthDateInvalid: { value: control.value, message: 'Data de nascimento inválida' } };
    }

    return null;
  };
}

/**
 * Valida data de nascimento de paciente (sem limite mínimo de idade)
 */
export function patientBirthDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const birthDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Não pode estar no futuro
    if (birthDate > today) {
      return { birthDateInvalid: { value: control.value, message: 'Data de nascimento não pode estar no futuro' } };
    }

    // Calcula idade
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Idade máxima: 150 anos (razoável para pacientes históricos)
    if (age > 150) {
      return { birthDateInvalid: { value: control.value, message: 'Data de nascimento inválida' } };
    }

    return null;
  };
}

/**
 * Valida que o campo contém apenas números
 */
export function numericOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    if (!/^\d+$/.test(control.value)) {
      return { numericOnly: { value: control.value, message: 'Apenas números são permitidos' } };
    }

    return null;
  };
}

/**
 * Valida CRM (formato alfanumérico, 4-10 caracteres)
 */
export function crmValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const crm = control.value.trim();

    // Deve ter entre 4 e 10 caracteres
    if (crm.length < 4 || crm.length > 10) {
      return { crmInvalid: { value: control.value, message: 'CRM deve ter entre 4 e 10 caracteres' } };
    }

    // Apenas letras e números
    if (!/^[A-Za-z0-9]+$/.test(crm)) {
      return { crmInvalid: { value: control.value, message: 'CRM deve conter apenas letras e números' } };
    }

    return null;
  };
}

/**
 * Valida força de senha
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra
 * - Pelo menos um número
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const password = control.value;

    if (password.length < 8) {
      return { passwordWeak: { message: 'Senha deve ter no mínimo 8 caracteres' } };
    }

    if (!/[a-zA-Z]/.test(password)) {
      return { passwordWeak: { message: 'Senha deve conter pelo menos uma letra' } };
    }

    if (!/\d/.test(password)) {
      return { passwordWeak: { message: 'Senha deve conter pelo menos um número' } };
    }

    return null;
  };
}

/**
 * Valida email format (mais rigoroso que o padrão)
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    // RFC 5322 simplificado
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(control.value)) {
      return { emailInvalid: { value: control.value, message: 'Email inválido' } };
    }

    return null;
  };
}

/**
 * Diretiva para impedir caracteres não-numéricos em inputs
 * Use como: (keypress)="onlyNumbers($event)"
 */
export function onlyNumbers(event: KeyboardEvent): boolean {
  const charCode = event.which ? event.which : event.keyCode;
  // Permite: backspace, delete, tab, escape, enter
  if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1) {
    return true;
  }
  // Permite Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
  if ((event.ctrlKey || event.metaKey) && [65, 67, 86, 88].indexOf(charCode) !== -1) {
    return true;
  }
  // Apenas números (0-9)
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
    return false;
  }
  return true;
}

/**
 * Formata CPF enquanto digita: 000.000.000-00
 */
export function formatCPF(value: string): string {
  if (!value) return '';
  const cpf = value.replace(/\D/g, '');
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
}

/**
 * Formata telefone enquanto digita: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  if (!value) return '';
  const phone = value.replace(/\D/g, '');
  if (phone.length <= 2) return phone;
  if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  if (phone.length <= 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
}
