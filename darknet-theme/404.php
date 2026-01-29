<?php
/**
 * 404 Error Page Template
 */
get_header();
?>

<article class="error-404">
    <pre style="color: #ff0033; font-size: 0.5rem; line-height: 1.1; margin-bottom: 2rem;">
    ██╗  ██╗ ██████╗ ██╗  ██╗
    ██║  ██║██╔═████╗██║  ██║
    ███████║██║██╔██║███████║
    ╚════██║████╔╝██║╚════██║
         ██║╚██████╔╝     ██║
         ╚═╝ ╚═════╝      ╚═╝
    </pre>

    <h1 class="error-code">404</h1>

    <p class="error-message">
        // CONNECTION_FAILED :: RESOURCE_NOT_FOUND
    </p>

    <div class="entry-content" style="max-width: 500px; margin: 0 auto; text-align: left;">
        <p>The requested resource could not be located on this server.</p>
        <p>Possible causes:</p>
        <ul style="list-style: none; margin: 1rem 0;">
            <li>> Link has been removed or relocated</li>
            <li>> URL contains a typo</li>
            <li>> Resource was never here</li>
            <li>> You lack authorization</li>
        </ul>

        <div style="margin-top: 2rem;">
            <h3>Try searching:</h3>
            <?php get_search_form(); ?>
        </div>

        <div style="margin-top: 2rem; text-align: center;">
            <a href="<?php echo esc_url(home_url('/')); ?>" class="read-more">[ Return to Homepage ]</a>
            <a href="<?php echo esc_url(home_url('/directory/')); ?>" class="read-more" style="margin-left: 1rem;">[ Browse Directory ]</a>
        </div>
    </div>
</article>

<?php get_footer(); ?>
