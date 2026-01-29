<?php
/**
 * Sidebar template
 */

if (!is_active_sidebar('sidebar-1') && !is_active_sidebar('sidebar-directory')) {
    // Default sidebar content when no widgets are configured
    ?>
    <aside class="sidebar">
        <!-- Warning Widget -->
        <div class="widget widget-warning">
            <h3 class="widget-title">Security Notice</h3>
            <p><?php echo esc_html(get_theme_mod('sidebar_warning', 'Always verify .onion URLs before visiting. Use Tor Browser for maximum privacy. Never trust, always verify.')); ?></p>
        </div>

        <!-- Search Widget -->
        <div class="widget">
            <h3 class="widget-title">Search</h3>
            <?php get_search_form(); ?>
        </div>

        <!-- Quick Links -->
        <div class="widget">
            <h3 class="widget-title">Quick Links</h3>
            <ul>
                <li><a href="<?php echo esc_url(home_url('/')); ?>">Home</a></li>
                <li><a href="<?php echo esc_url(home_url('/directory/')); ?>">Onion Directory</a></li>
                <li><a href="<?php echo esc_url(home_url('/blog/')); ?>">Blog</a></li>
            </ul>
        </div>

        <!-- Categories Widget -->
        <?php
        $onion_cats = get_terms(array(
            'taxonomy'   => 'onion_category',
            'hide_empty' => true,
        ));

        if (!empty($onion_cats) && !is_wp_error($onion_cats)) :
        ?>
        <div class="widget">
            <h3 class="widget-title">Directory Categories</h3>
            <ul>
                <?php foreach ($onion_cats as $cat) : ?>
                    <li>
                        <a href="<?php echo esc_url(get_term_link($cat)); ?>">
                            <?php echo esc_html($cat->name); ?>
                        </a>
                        <span class="text-muted">(<?php echo esc_html($cat->count); ?>)</span>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <!-- Recent Posts -->
        <?php
        $recent_posts = new WP_Query(array(
            'posts_per_page' => 5,
            'post_type'      => 'post',
        ));

        if ($recent_posts->have_posts()) :
        ?>
        <div class="widget">
            <h3 class="widget-title">Recent Posts</h3>
            <ul>
                <?php while ($recent_posts->have_posts()) : $recent_posts->the_post(); ?>
                    <li>
                        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                    </li>
                <?php endwhile; ?>
            </ul>
        </div>
        <?php
        wp_reset_postdata();
        endif;
        ?>

        <!-- Stats Widget -->
        <div class="widget">
            <h3 class="widget-title">Directory Stats</h3>
            <ul>
                <li>Total Links: <?php echo wp_count_posts('onion_link')->publish; ?></li>
                <li>Categories: <?php echo count($onion_cats); ?></li>
                <li>Last Update: <?php echo date('Y-m-d'); ?></li>
            </ul>
        </div>
    </aside>
    <?php
    return;
}
?>

<aside class="sidebar">
    <?php
    if (is_post_type_archive('onion_link') || is_singular('onion_link')) {
        if (is_active_sidebar('sidebar-directory')) {
            dynamic_sidebar('sidebar-directory');
        } else {
            dynamic_sidebar('sidebar-1');
        }
    } else {
        dynamic_sidebar('sidebar-1');
    }
    ?>
</aside>
