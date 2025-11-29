import { GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-foreground dark:bg-card text-background dark:text-card-foreground py-12 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-white/10 dark:bg-white/5">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">Study Circle</span>
            </div>
            <p className="text-white/70 dark:text-muted-foreground mb-4 leading-relaxed">
              Connecting students worldwide through peer-to-peer learning and collaborative study sessions.
            </p>
            <p className="text-white/70 dark:text-muted-foreground text-sm">
              © 2025 Study Circle • studycircleteam2@gmail.com
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white dark:text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-white/70 dark:text-muted-foreground">
              <li><a href="#about" className="hover:text-white dark:hover:text-foreground transition-colors">About</a></li>
              <li><a href="#projects" className="hover:text-white dark:hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="#skills" className="hover:text-white dark:hover:text-foreground transition-colors">Subjects</a></li>
              <li><a href="#contact" className="hover:text-white dark:hover:text-foreground transition-colors">Join Now</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-white dark:text-foreground">Contact</h4>
            <div className="space-y-2 text-white/70 dark:text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a 
                  href="mailto:studycircleteam2@gmail.com" 
                  className="hover:text-white dark:hover:text-foreground transition-colors"
                >
                  studycircleteam2@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Pune, Maharashtra</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-border mt-8 pt-8 text-center">
          <p className="text-white/70 dark:text-muted-foreground text-sm">
            Built with ❤️ for students, by students
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;