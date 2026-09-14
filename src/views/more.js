export function renderMore() {
  return `
    <section class="card more-hero">
      <div class="tiny">PepStep Guide &amp; Research</div>
      <h1>PepStep</h1>
      <p style="margin:0;font-weight:800;color:var(--navy)">Put a Pep in Your Step</p>
      <p class="motto">Longevity is Movement</p>
      <p class="muted">Family owned · Veteran owned</p>
    </section>

    <section class="card">
      <div class="tiny">This app</div>
      <p class="disclaimer">PepStep here is <strong>Diary + Workouts + More</strong> only. Peptide catalog, logbook, reminders, shop, and regimen tools are intentionally left out of this app.</p>
    </section>

    <section class="card">
      <div class="tiny">Links</div>
      <a class="link-out" href="https://pepstepguide.com" target="_blank" rel="noopener noreferrer">pepstepguide.com</a>
      <a class="link-out" href="mailto:support@pepstepguide.com">support@pepstepguide.com</a>
    </section>

    <section class="card">
      <div class="tiny">Not medical advice</div>
      <p class="disclaimer">The information in PepStep is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with questions about a medical condition or before starting a nutrition or training program. If you think you may have a medical emergency, call emergency services immediately.</p>
    </section>

    <section class="card">
      <div class="tiny">On this device</div>
      <p class="disclaimer">Diary, goals, workouts, and plans are stored in this browser with localStorage. Clearing site data will erase them.</p>
      <button class="danger" data-act="reset-data">Clear local PepStep data</button>
    </section>
  `;
}
