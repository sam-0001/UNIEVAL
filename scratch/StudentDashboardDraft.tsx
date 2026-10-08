import React, { useState, useEffect } from 'react';
import { useAuth, useCredits } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, UserRole } from '../types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileText, Video, 
  Settings, CreditCard, Sparkles, GraduationCap, Clock, ChevronRight
} from 'lucide-react';

const StudentDashboard = () => {
    return <div>Dashboard</div>;
}
export default StudentDashboard;
