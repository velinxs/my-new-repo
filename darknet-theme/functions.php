<?php
/**
 * Darknet Directory Theme Functions
 *
 * @package Darknet_Directory
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme Setup
 */
function darknet_theme_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));

    // Register navigation menus
    register_nav_menus(array(
        'primary' => 'Primary Menu',
        'footer'  => 'Footer Menu',
    ));
}
add_action('after_setup_theme', 'darknet_theme_setup');

/**
 * Enqueue styles (no JavaScript!)
 */
function darknet_enqueue_styles() {
    wp_enqueue_style(
        'darknet-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get('Version')
    );
}
add_action('wp_enqueue_scripts', 'darknet_enqueue_styles');

/**
 * Remove default WordPress scripts for privacy
 */
function darknet_remove_scripts() {
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');

    // Remove embed scripts
    wp_deregister_script('wp-embed');

    // Remove jQuery (no JS theme!)
    if (!is_admin()) {
        wp_deregister_script('jquery');
    }
}
add_action('wp_enqueue_scripts', 'darknet_remove_scripts', 100);

/**
 * Clean up wp_head for privacy
 */
function darknet_cleanup_head() {
    remove_action('wp_head', 'rsd_link');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'wp_shortlink_wp_head');
    remove_action('wp_head', 'rest_output_link_wp_head');
    remove_action('wp_head', 'wp_oembed_add_discovery_links');
    remove_action('wp_head', 'feed_links', 2);
    remove_action('wp_head', 'feed_links_extra', 3);
}
add_action('init', 'darknet_cleanup_head');

/**
 * Register Onion Link Custom Post Type
 */
function darknet_register_onion_links_cpt() {
    $labels = array(
        'name'               => 'Onion Links',
        'singular_name'      => 'Onion Link',
        'menu_name'          => 'Onion Directory',
        'add_new'            => 'Add New Link',
        'add_new_item'       => 'Add New Onion Link',
        'edit_item'          => 'Edit Onion Link',
        'new_item'           => 'New Onion Link',
        'view_item'          => 'View Onion Link',
        'search_items'       => 'Search Onion Links',
        'not_found'          => 'No onion links found',
        'not_found_in_trash' => 'No onion links found in trash',
    );

    $args = array(
        'labels'              => $labels,
        'public'              => true,
        'publicly_queryable'  => true,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'query_var'           => true,
        'rewrite'             => array('slug' => 'onion'),
        'capability_type'     => 'post',
        'has_archive'         => 'directory',
        'hierarchical'        => false,
        'menu_position'       => 5,
        'menu_icon'           => 'dashicons-admin-links',
        'supports'            => array('title', 'editor', 'thumbnail'),
    );

    register_post_type('onion_link', $args);
}
add_action('init', 'darknet_register_onion_links_cpt');

/**
 * Register Onion Link Categories
 */
function darknet_register_onion_taxonomy() {
    $labels = array(
        'name'              => 'Link Categories',
        'singular_name'     => 'Link Category',
        'search_items'      => 'Search Categories',
        'all_items'         => 'All Categories',
        'parent_item'       => 'Parent Category',
        'parent_item_colon' => 'Parent Category:',
        'edit_item'         => 'Edit Category',
        'update_item'       => 'Update Category',
        'add_new_item'      => 'Add New Category',
        'new_item_name'     => 'New Category Name',
        'menu_name'         => 'Categories',
    );

    $args = array(
        'hierarchical'      => true,
        'labels'            => $labels,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'rewrite'           => array('slug' => 'link-category'),
    );

    register_taxonomy('onion_category', array('onion_link'), $args);

    // Register tags for onion links
    register_taxonomy('onion_tag', 'onion_link', array(
        'hierarchical' => false,
        'labels'       => array(
            'name'          => 'Link Tags',
            'singular_name' => 'Link Tag',
        ),
        'rewrite'      => array('slug' => 'link-tag'),
    ));
}
add_action('init', 'darknet_register_onion_taxonomy');

/**
 * Add custom meta boxes for Onion Links
 */
function darknet_add_onion_meta_boxes() {
    add_meta_box(
        'onion_link_details',
        'Onion Link Details',
        'darknet_onion_meta_box_callback',
        'onion_link',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'darknet_add_onion_meta_boxes');

/**
 * Onion Link Meta Box Callback
 */
function darknet_onion_meta_box_callback($post) {
    wp_nonce_field('darknet_onion_meta', 'darknet_onion_nonce');

    $onion_url = get_post_meta($post->ID, '_onion_url', true);
    $onion_status = get_post_meta($post->ID, '_onion_status', true);
    $onion_mirrors = get_post_meta($post->ID, '_onion_mirrors', true);
    $last_checked = get_post_meta($post->ID, '_last_checked', true);
    ?>
    <table class="form-table">
        <tr>
            <th><label for="onion_url">Onion URL</label></th>
            <td>
                <input type="text" id="onion_url" name="onion_url"
                       value="<?php echo esc_attr($onion_url); ?>"
                       class="large-text"
                       placeholder="http://example.onion">
                <p class="description">The primary .onion URL for this link</p>
            </td>
        </tr>
        <tr>
            <th><label for="onion_status">Status</label></th>
            <td>
                <select id="onion_status" name="onion_status">
                    <option value="unknown" <?php selected($onion_status, 'unknown'); ?>>Unknown</option>
                    <option value="online" <?php selected($onion_status, 'online'); ?>>Online</option>
                    <option value="offline" <?php selected($onion_status, 'offline'); ?>>Offline</option>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="onion_mirrors">Mirror URLs</label></th>
            <td>
                <textarea id="onion_mirrors" name="onion_mirrors" rows="4"
                          class="large-text"
                          placeholder="One URL per line"><?php echo esc_textarea($onion_mirrors); ?></textarea>
                <p class="description">Alternative/mirror .onion URLs (one per line)</p>
            </td>
        </tr>
        <?php if ($last_checked) : ?>
        <tr>
            <th>Last Checked</th>
            <td><?php echo esc_html($last_checked); ?></td>
        </tr>
        <?php endif; ?>
    </table>
    <?php
}

/**
 * Save Onion Link Meta
 */
function darknet_save_onion_meta($post_id) {
    if (!isset($_POST['darknet_onion_nonce'])) {
        return;
    }

    if (!wp_verify_nonce($_POST['darknet_onion_nonce'], 'darknet_onion_meta')) {
        return;
    }

    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    if (isset($_POST['onion_url'])) {
        update_post_meta($post_id, '_onion_url', sanitize_text_field($_POST['onion_url']));
    }

    if (isset($_POST['onion_status'])) {
        update_post_meta($post_id, '_onion_status', sanitize_text_field($_POST['onion_status']));
    }

    if (isset($_POST['onion_mirrors'])) {
        update_post_meta($post_id, '_onion_mirrors', sanitize_textarea_field($_POST['onion_mirrors']));
    }
}
add_action('save_post_onion_link', 'darknet_save_onion_meta');

/**
 * Register Sidebar
 */
function darknet_widgets_init() {
    register_sidebar(array(
        'name'          => 'Sidebar',
        'id'            => 'sidebar-1',
        'description'   => 'Main sidebar widget area',
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));

    register_sidebar(array(
        'name'          => 'Directory Sidebar',
        'id'            => 'sidebar-directory',
        'description'   => 'Sidebar for the onion directory',
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));
}
add_action('widgets_init', 'darknet_widgets_init');

/**
 * Fallback menu if no menu is set
 */
function darknet_fallback_menu() {
    echo '<ul class="nav-menu">';
    echo '<li><a href="' . esc_url(home_url('/')) . '">Home</a></li>';
    echo '<li><a href="' . esc_url(home_url('/directory/')) . '">Directory</a></li>';
    echo '<li><a href="' . esc_url(home_url('/blog/')) . '">Blog</a></li>';
    echo '</ul>';
}

/**
 * Custom excerpt length
 */
function darknet_excerpt_length($length) {
    return 30;
}
add_filter('excerpt_length', 'darknet_excerpt_length');

/**
 * Custom excerpt more
 */
function darknet_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'darknet_excerpt_more');

/**
 * Get onion links by category
 */
function darknet_get_onion_links($category = '', $limit = -1) {
    $args = array(
        'post_type'      => 'onion_link',
        'posts_per_page' => $limit,
        'orderby'        => 'title',
        'order'          => 'ASC',
    );

    if (!empty($category)) {
        $args['tax_query'] = array(
            array(
                'taxonomy' => 'onion_category',
                'field'    => 'slug',
                'terms'    => $category,
            ),
        );
    }

    return new WP_Query($args);
}

/**
 * Display single onion link card
 */
function darknet_display_onion_link($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }

    $onion_url = get_post_meta($post_id, '_onion_url', true);
    $status = get_post_meta($post_id, '_onion_status', true) ?: 'unknown';
    $mirrors = get_post_meta($post_id, '_onion_mirrors', true);
    $categories = get_the_terms($post_id, 'onion_category');
    $tags = get_the_terms($post_id, 'onion_tag');
    ?>
    <li class="onion-link">
        <div class="onion-link-header">
            <h4 class="onion-link-title">
                <a href="<?php the_permalink($post_id); ?>"><?php echo get_the_title($post_id); ?></a>
            </h4>
            <span class="onion-status <?php echo esc_attr($status); ?>">
                <?php echo esc_html(ucfirst($status)); ?>
            </span>
        </div>

        <?php if ($onion_url) : ?>
        <div class="onion-url">
            <a href="<?php echo esc_url($onion_url); ?>" rel="nofollow noopener">
                <?php echo esc_html($onion_url); ?>
            </a>
        </div>
        <?php endif; ?>

        <div class="onion-description">
            <?php echo wp_trim_words(get_the_excerpt($post_id), 25); ?>
        </div>

        <?php if ($tags && !is_wp_error($tags)) : ?>
        <div class="onion-tags">
            <?php foreach ($tags as $tag) : ?>
                <a href="<?php echo esc_url(get_term_link($tag)); ?>" class="onion-tag">
                    <?php echo esc_html($tag->name); ?>
                </a>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <?php if ($mirrors) : ?>
        <div class="onion-meta">
            <span>+ <?php echo count(array_filter(explode("\n", $mirrors))); ?> mirror(s) available</span>
        </div>
        <?php endif; ?>
    </li>
    <?php
}

/**
 * Customizer settings
 */
function darknet_customize_register($wp_customize) {
    // PGP Section
    $wp_customize->add_section('darknet_pgp', array(
        'title'    => 'PGP Settings',
        'priority' => 30,
    ));

    $wp_customize->add_setting('pgp_fingerprint', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_text_field',
    ));

    $wp_customize->add_control('pgp_fingerprint', array(
        'label'   => 'PGP Fingerprint',
        'section' => 'darknet_pgp',
        'type'    => 'text',
    ));

    $wp_customize->add_setting('pgp_key', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));

    $wp_customize->add_control('pgp_key', array(
        'label'   => 'Full PGP Public Key',
        'section' => 'darknet_pgp',
        'type'    => 'textarea',
    ));

    // Warning Section
    $wp_customize->add_section('darknet_warnings', array(
        'title'    => 'Warning Messages',
        'priority' => 35,
    ));

    $wp_customize->add_setting('sidebar_warning', array(
        'default'           => 'Always verify .onion URLs before visiting. Use Tor Browser for maximum privacy.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));

    $wp_customize->add_control('sidebar_warning', array(
        'label'   => 'Sidebar Warning Message',
        'section' => 'darknet_warnings',
        'type'    => 'textarea',
    ));
}
add_action('customize_register', 'darknet_customize_register');

/**
 * Disable XML-RPC for security
 */
add_filter('xmlrpc_enabled', '__return_false');

/**
 * Remove version numbers from scripts/styles for privacy
 */
function darknet_remove_version_strings($src) {
    if (strpos($src, 'ver=')) {
        $src = remove_query_arg('ver', $src);
    }
    return $src;
}
add_filter('style_loader_src', 'darknet_remove_version_strings', 9999);
add_filter('script_loader_src', 'darknet_remove_version_strings', 9999);
