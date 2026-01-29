        </main>

        <?php get_sidebar(); ?>
    </div>

    <footer class="site-footer">
        <pre class="footer-ascii">
  _____                             __           __   __  __                    __
 / ___/___  _______  __________    / /___  _____/ /  / / / /___  ____ _      __/ /_
 \__ \/ _ \/ ___/ / / / ___/ _ \  / / __ \/ ___/ /  / / / / __ \/ __ \ | /| / / __/
___/ /  __/ /__/ /_/ / /  /  __/ / / /_/ (__  ) /  / /_/ / /_/ / / / / |/ |/ / /_
/____/\___/\___/\__,_/_/   \___(_)_/\____/____(_)  \____/ .___/_/ /_/|__/|__/\__/
                                                       /_/
        </pre>

        <div class="footer-content">
            <div class="footer-warning">
                WARNING: Verify all .onion links before accessing.
                This directory provides no guarantees. Stay anonymous. Trust no one.
            </div>

            <div class="footer-links">
                <a href="<?php echo esc_url(home_url('/')); ?>">Home</a> |
                <a href="<?php echo esc_url(home_url('/directory/')); ?>">Directory</a> |
                <a href="<?php echo esc_url(home_url('/submit-link/')); ?>">Submit Link</a> |
                <?php if (get_theme_mod('pgp_key')) : ?>
                <a href="<?php echo esc_url(home_url('/pgp/')); ?>">PGP Key</a>
                <?php endif; ?>
            </div>

            <?php if (get_theme_mod('pgp_fingerprint')) : ?>
            <div class="pgp-key">
                PGP Fingerprint:
                <code><?php echo esc_html(get_theme_mod('pgp_fingerprint')); ?></code>
            </div>
            <?php endif; ?>

            <p style="margin-top: 1rem;">
                <?php echo date('Y'); ?> :: No logs. No traces.
                <span class="cursor-blink"></span>
            </p>

            <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.7rem;">
                Powered by WordPress :: Theme: Darknet Directory
            </p>
        </div>
    </footer>
</div>

<?php wp_footer(); ?>
</body>
</html>
