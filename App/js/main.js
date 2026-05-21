function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
}

// Navbar scroll shadow
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

// Active nav link
(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// Fade-in on scroll
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('animate-fade-in');
      observer.unobserve(e.target);
    }
  }),
  { threshold: 0.12 }
);

document.querySelectorAll('.feature-card, .step, .season-card, .tone-card, .concept-card, .result-card')
  .forEach(el => observer.observe(el));

// Diagnosis page: color strip active toggle
document.querySelectorAll('.color-strip-item').forEach((item, i) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.color-strip-item').forEach(x => x.classList.remove('active'));
    item.classList.add('active');
  });
});
