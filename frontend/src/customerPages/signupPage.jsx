import React, { useState } from "react";
import { Box, Button, TextField, Typography, Link } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import RoleSelector from "../components/RoleSelector";
import { useAuth } from "../context/authProvider";
import axios from "axios";

const SignupPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const trimmedPhone = phone.trim();
      const response = await axios.post(
        "http://localhost:5000/api/auth/signup",
        {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: trimmedPhone || undefined,
          password,
          role,
        }
      );

      const { user, token } = response.data;
      login(user, token);

      if (user.role.name === "customer") {
        navigate("/rental-shop");
      } else if (user.role.name === "enduser") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Signup failed", error);
      const message = error.response?.data?.message || "Signup failed";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={5}>
      <Typography variant="h5" mb={2}>
        Sign Up
      </Typography>
      <form onSubmit={handleSubmit}>
        <RoleSelector role={role} setRole={setRole} />
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label="Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <TextField
          label="Phone"
          fullWidth
          margin="normal"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        <Button
          variant="contained"
          type="submit"
          fullWidth
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? "Registering..." : "Register"}
        </Button>
      </form>
      <Box mt={2}>
        <Link component={RouterLink} to="/login">
          Already have an account? Login
        </Link>
      </Box>
    </Box>
  );
};

export default SignupPage;
