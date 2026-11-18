export function getPasswordRequirements(password = "") {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /\d/.test(password) },
    { label: "A symbol", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isStrongPassword(password) {
  return typeof password === "string"
    && password.length <= 72
    && getPasswordRequirements(password).every((requirement) => requirement.met);
}
