import React from 'react';
import { 
  Utensils, Home, Tv, Coffee, Car, PartyPopper, GraduationCap, 
  HeartPulse, Pizza, TrendingUp, Gamepad2, ShoppingCart, 
  MoreHorizontal, User, Gift, Bus, Plane, Shirt, 
  Banknote, Wallet, Coins, History, Briefcase, Zap, Smartphone, Tag
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, size = 16, className = "" }) => {
  const getIcon = () => {
    switch (category) {
      // Despesas
      case 'Alimentação': return Utensils;
      case 'Apê': return Home;
      case 'Assinaturas': return Tv;
      case 'Besteiras': return Coffee;
      case 'Carro': return Car;
      case 'Comemoração': return PartyPopper;
      case 'Educação':
      case 'Estudo': return GraduationCap;
      case 'Farmácia':
      case 'Saúde': return HeartPulse;
      case 'Ifood': return Pizza;
      case 'Investimento':
      case 'Investimentos': return TrendingUp;
      case 'Lazer': return Gamepad2;
      case 'Mercado': return ShoppingCart;
      case 'Pessoais':
      case 'Lucas': return User;
      case 'Presente': return Gift;
      case 'Transporte': return Bus;
      case 'Viagem': return Plane;
      case 'Vestuário': return Shirt;
      
      // Receitas
      case 'Salário': return Banknote;
      case 'Bonificação':
      case '13°': return Gift;
      case 'Empréstimo': return HandCoins;
      case 'Vale Alimentação':
      case 'Vale Refeição': return Utensils;
      case 'Saldo Anterior': return History;
      case 'ISK': return Briefcase;
      
      default: return Tag;
    }
  };

  // Helper local component for fallback logic
  const HandCoins = Coins; // Alias

  const IconComponent = getIcon();

  return <IconComponent size={size} className={className} />;
};
